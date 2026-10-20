import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateDecisionDto,
} from './dto/assessment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create examiner assessment for a claim
   */
  async create(claimId: string, dto: CreateAssessmentDto, examinerId: string, role: string) {
    if (role !== 'EXAMINER' && role !== 'ADMIN') {
      throw new ForbiddenException('Only examiners and admins can assess claims');
    }

    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { assessment: true },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }

    if (claim.assessment) {
      throw new ConflictException('An assessment already exists for this claim. Use PATCH to update.');
    }

    const assessment = await this.prisma.examinerAssessment.create({
      data: {
        claimId,
        severity: dto.severity,
        estimatedLossEtb: new Prisma.Decimal(dto.estimatedLossEtb),
        currency: dto.currency || 'ETB',
        notes: dto.notes,
        examinerId,
      },
    });

    // Automatically transition status to ASSESSED if under review
    if (claim.status === 'UNDER_REVIEW') {
      await this.prisma.claim.update({
        where: { id: claimId },
        data: { status: 'ASSESSED' },
      });
    }

    // Audit Event
    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: examinerId,
        action: 'ASSESSMENT_CREATED',
        summary: `Claim assessed with severity ${dto.severity} and estimated loss ${dto.estimatedLossEtb} ETB`,
        details: {
          assessmentId: assessment.id,
          severity: dto.severity,
          estimatedLossEtb: dto.estimatedLossEtb,
        },
      },
    });

    return {
      id: assessment.id,
      claimId: assessment.claimId,
      severity: assessment.severity,
      estimatedLossEtb: assessment.estimatedLossEtb.toString(),
      currency: assessment.currency,
      notes: assessment.notes,
      examinerId: assessment.examinerId,
      createdAt: assessment.createdAt,
    };
  }

  /**
   * Get assessment by claim ID
   */
  async findByClaimId(claimId: string, userId: string, role: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { assessment: true },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }

    if (role === 'INTAKE_USER' && claim.createdById !== userId) {
      throw new ForbiddenException('Access to claim assessment is restricted');
    }

    if (!claim.assessment) {
      throw new NotFoundException(`No assessment found for claim ${claimId}`);
    }

    return {
      id: claim.assessment.id,
      claimId: claim.assessment.claimId,
      severity: claim.assessment.severity,
      estimatedLossEtb: claim.assessment.estimatedLossEtb?.toString(),
      currency: claim.assessment.currency,
      notes: claim.assessment.notes,
      examinerId: claim.assessment.examinerId,
      createdAt: claim.assessment.createdAt,
      updatedAt: claim.assessment.updatedAt,
    };
  }

  /**
   * Update assessment
   */
  async update(claimId: string, dto: UpdateAssessmentDto, userId: string, role: string) {
    if (role !== 'EXAMINER' && role !== 'ADMIN') {
      throw new ForbiddenException('Only examiners and admins can update assessments');
    }

    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { assessment: true },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }

    if (!claim.assessment) {
      throw new NotFoundException(`No assessment exists for claim ${claimId} to update`);
    }

    const updateData: any = {};
    if (dto.severity) updateData.severity = dto.severity;
    if (dto.estimatedLossEtb) updateData.estimatedLossEtb = new Prisma.Decimal(dto.estimatedLossEtb);
    if (dto.currency) updateData.currency = dto.currency;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.prisma.examinerAssessment.update({
      where: { claimId },
      data: updateData,
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: 'ASSESSMENT_UPDATED',
        summary: `Assessment updated: ${dto.severity || updated.severity}, ${dto.estimatedLossEtb || updated.estimatedLossEtb} ETB`,
        details: updateData,
      },
    });

    return {
      id: updated.id,
      claimId: updated.claimId,
      severity: updated.severity,
      estimatedLossEtb: updated.estimatedLossEtb?.toString(),
      currency: updated.currency,
      notes: updated.notes,
      examinerId: updated.examinerId,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Create human examiner decision record
   */
  async recordDecision(claimId: string, dto: CreateDecisionDto, actorId: string, role: string) {
    if (role !== 'EXAMINER' && role !== 'ADMIN') {
      throw new ForbiddenException('Only examiners and admins can record claim decisions');
    }

    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }

    const decision = await this.prisma.claimDecision.create({
      data: {
        claimId,
        decision: dto.decision,
        reason: dto.reason,
        actorId,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId,
        action: 'DECISION_RECORDED',
        summary: `Decision recorded: ${dto.decision}`,
        details: { decisionId: decision.id, reason: dto.reason },
      },
    });

    return {
      id: decision.id,
      claimId: decision.claimId,
      decision: decision.decision,
      reason: decision.reason,
      actorId: decision.actorId,
      createdAt: decision.createdAt,
    };
  }
}
