import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClaimDto, UpdateClaimDto, UpdateClaimStatusDto } from './dto/claims.dto';

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['PROCESSING', 'POLICY_UNVERIFIED', 'UNDER_REVIEW'],
  POLICY_UNVERIFIED: ['SUBMITTED'],
  PROCESSING: ['READY_FOR_REVIEW', 'NEED_MORE_EVIDENCE'],
  READY_FOR_REVIEW: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['ASSESSED', 'NEED_MORE_EVIDENCE', 'READY_FOR_REVIEW'],
  NEED_MORE_EVIDENCE: ['UNDER_REVIEW', 'READY_FOR_REVIEW'],
  ASSESSED: ['APPROVED', 'REJECTED', 'UNDER_REVIEW'],
  APPROVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

function formatClaim(c: any) {
  return {
    id: c.id,
    claimNumber: c.claimNumber,
    status: c.status,
    policyVerification: c.policyVerification,
    claimant: {
      fullName: c.claimantFullName,
      phone: c.claimantPhone,
      email: c.claimantEmail,
    },
    vehicle: {
      plateNumber: c.vehiclePlateNumber,
      make: c.vehicleMake,
      model: c.vehicleModel,
      year: c.vehicleYear,
      vin: c.vehicleVin,
    },
    incident: {
      occurredAt: c.incidentOccurredAt,
      location: c.incidentLocation,
      description: c.incidentDescription,
      incidentType: c.incidentType,
    },
    policy: c.policy
      ? {
          id: c.policy.id,
          policyNumber: c.policy.policyNumber,
          status: c.policy.status,
          insurer: c.policy.insurer,
        }
      : null,
    evidenceCount: c._count?.evidence ?? 0,
    assessment: c.assessment
      ? {
          id: c.assessment.id,
          severity: c.assessment.severity,
          estimatedLossEtb: c.assessment.estimatedLossEtb?.toString(),
          currency: c.assessment.currency,
          notes: c.assessment.notes,
          examinerId: c.assessment.examinerId,
          createdAt: c.assessment.createdAt,
        }
      : null,
    createdById: c.createdById,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.claim.count();
    const seq = String(count + 1).padStart(5, '0');
    return `EC-${year}-${seq}`;
  }

  async create(dto: CreateClaimDto, userId: string) {
    // Verify policy if policyNumber provided
    let policyId: string | undefined;
    let policyVerification = 'PENDING';

    if (dto.policyNumber) {
      const normalized = dto.policyNumber.replace(/[-\s]/g, '').toUpperCase();
      const policy = await this.prisma.policy.findFirst({
        where: {
          OR: [
            { policyNumber: { equals: dto.policyNumber, mode: 'insensitive' } },
            { normalizedPolicyNumber: normalized },
          ],
        },
      });
      if (policy) {
        policyId = policy.id;
        policyVerification = policy.status === 'ACTIVE' ? 'VERIFIED' : 'POLICY_INACTIVE';
      } else {
        policyVerification = 'NOT_FOUND';
      }
    }

    const claimNumber = await this.generateClaimNumber();

    const claim = await this.prisma.claim.create({
      data: {
        claimNumber,
        status: 'SUBMITTED',
        policyVerification,
        policyId,
        claimantFullName: dto.claimant.fullName,
        claimantPhone: dto.claimant.phone,
        claimantEmail: dto.claimant.email,
        vehiclePlateNumber: dto.vehicle?.plateNumber,
        vehicleMake: dto.vehicle?.make,
        vehicleModel: dto.vehicle?.model,
        vehicleYear: dto.vehicle?.year,
        vehicleVin: dto.vehicle?.vin,
        incidentOccurredAt: dto.incident?.occurredAt ? new Date(dto.incident.occurredAt) : undefined,
        incidentLocation: dto.incident?.location,
        incidentDescription: dto.incident?.description,
        incidentType: (dto.incident?.incidentType as any) || 'OTHER',
        createdById: userId,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId: claim.id,
        actorId: userId,
        action: 'CLAIM_CREATED',
        summary: `Claim ${claimNumber} created`,
      },
    });

    return {
      id: claim.id,
      claimNumber: claim.claimNumber,
      status: claim.status,
      policyVerification: claim.policyVerification,
      createdAt: claim.createdAt,
    };
  }

  async findAll(
    userId: string,
    userRole: string,
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      q?: string;
      from?: string;
      to?: string;
      assignedToMe?: boolean;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // Scope results by role
    if (userRole === 'INTAKE_USER') {
      where.createdById = userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      where.OR = [
        { claimNumber: { contains: query.q, mode: 'insensitive' } },
        { claimantFullName: { contains: query.q, mode: 'insensitive' } },
        { vehiclePlateNumber: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          policy: true,
          assessment: true,
          _count: { select: { evidence: true } },
        },
      }),
      this.prisma.claim.count({ where }),
    ]);

    return {
      items: items.map(formatClaim),
      page,
      pageSize,
      total,
    };
  }

  async findById(claimId: string, userId: string, userRole: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        policy: true,
        assessment: true,
        _count: { select: { evidence: true } },
      },
    });

    if (!claim) throw new NotFoundException('Claim not found');

    if (userRole === 'INTAKE_USER' && claim.createdById !== userId) {
      throw new ForbiddenException('Access denied to this claim');
    }

    return formatClaim(claim);
  }

  async update(claimId: string, dto: UpdateClaimDto, userId: string, userRole: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');

    if (userRole === 'INTAKE_USER' && claim.createdById !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // INTAKE_USER can only edit before review
    if (
      userRole === 'INTAKE_USER' &&
      ['UNDER_REVIEW', 'ASSESSED', 'APPROVED', 'REJECTED', 'CLOSED'].includes(claim.status)
    ) {
      throw new ConflictException('Claim cannot be edited in its current status');
    }

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        ...(dto.claimant?.fullName && { claimantFullName: dto.claimant.fullName }),
        ...(dto.claimant?.phone !== undefined && { claimantPhone: dto.claimant.phone }),
        ...(dto.claimant?.email !== undefined && { claimantEmail: dto.claimant.email }),
        ...(dto.vehicle?.plateNumber !== undefined && { vehiclePlateNumber: dto.vehicle.plateNumber }),
        ...(dto.vehicle?.make !== undefined && { vehicleMake: dto.vehicle.make }),
        ...(dto.vehicle?.model !== undefined && { vehicleModel: dto.vehicle.model }),
        ...(dto.vehicle?.year !== undefined && { vehicleYear: dto.vehicle.year }),
        ...(dto.vehicle?.vin !== undefined && { vehicleVin: dto.vehicle.vin }),
        ...(dto.incident?.occurredAt && { incidentOccurredAt: new Date(dto.incident.occurredAt) }),
        ...(dto.incident?.location !== undefined && { incidentLocation: dto.incident.location }),
        ...(dto.incident?.description !== undefined && { incidentDescription: dto.incident.description }),
        ...(dto.incident?.incidentType !== undefined && { incidentType: dto.incident.incidentType as any }),
      },
      include: { policy: true, assessment: true, _count: { select: { evidence: true } } },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: 'CLAIM_UPDATED',
        summary: 'Claim intake fields updated',
      },
    });

    return formatClaim(updated);
  }

  async updateStatus(
    claimId: string,
    dto: UpdateClaimStatusDto,
    userId: string,
    userRole: string,
  ) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');

    if (userRole === 'INTAKE_USER') {
      // Intake users can only submit (DRAFT -> SUBMITTED)
      if (claim.status !== 'DRAFT' || dto.status !== 'SUBMITTED') {
        throw new ForbiddenException('Intake users can only submit draft claims');
      }
    }

    const allowed = ALLOWED_TRANSITIONS[claim.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Claim cannot move from ${claim.status} to ${dto.status}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: { status: dto.status as any },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: 'STATUS_CHANGED',
        summary: `Status changed from ${claim.status} to ${dto.status}${dto.note ? ': ' + dto.note : ''}`,
        details: { from: claim.status, to: dto.status, note: dto.note },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  async getTimeline(claimId: string, userId: string, userRole: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');

    if (userRole === 'INTAKE_USER' && claim.createdById !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const events = await this.prisma.auditEvent.findMany({
      where: { claimId },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, name: true, role: true } } },
    });

    return {
      items: events.map((e) => ({
        id: e.id,
        action: e.action,
        actor: e.actor,
        summary: e.summary,
        details: e.details,
        createdAt: e.createdAt,
      })),
    };
  }

  async requestEvidence(claimId: string, dto: any, userId: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: { status: 'NEED_MORE_EVIDENCE' },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: 'EVIDENCE_REQUESTED',
        summary: dto.message,
        details: { requestedItems: dto.requestedItems },
      },
    });

    return {
      id: claimId,
      claimId,
      status: updated.status,
      message: dto.message,
    };
  }
}
