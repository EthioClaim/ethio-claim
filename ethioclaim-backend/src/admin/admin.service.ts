import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreatePolicyDto,
  UpdatePolicyDto,
} from './dto/admin.dto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

function normalizePolicyNumber(pn: string): string {
  return pn.replace(/[-\s]/g, '').toUpperCase();
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  // ── Users Management ────────────────────────────────────────────────────────
  async findAllUsers(query: {
    page?: number;
    pageSize?: number;
    role?: string;
    active?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.active !== undefined) where.active = query.active;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        displayName: u.name,
        username: u.email.split('@')[0],
        email: u.email,
        role: u.role,
        active: u.active,
        status: u.active ? 'ACTIVE' : 'INACTIVE',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      page,
      pageSize,
      total,
    };
  }

  async createUser(dto: CreateUserDto, adminId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const name =
      dto.name || dto.displayName || dto.username || dto.email.split("@")[0];

    const user = await this.prisma.user.create({
      data: {
        name,
        email: dto.email.toLowerCase().trim(),
        role: dto.role,
        passwordHash,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: "ADMIN_USER_CREATED",
        summary: `Admin created user ${user.email} with role ${user.role}`,
        details: { userId: user.id, role: user.role },
      },
    });

    return {
      ...user,
      displayName: user.name,
      username: user.email.split("@")[0],
      status: user.active ? "ACTIVE" : "INACTIVE",
    };
  }

  async updateUser(userId: string, dto: UpdateUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updateData: any = {};
    const name = dto.name || dto.displayName || dto.username;
    if (name !== undefined) updateData.name = name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.status !== undefined) updateData.active = dto.status === "ACTIVE";
    if (dto.password && dto.password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: "ADMIN_USER_UPDATED",
        summary: `Admin updated user ${user.email}`,
        details: updateData,
      },
    });

    return {
      ...updated,
      displayName: updated.name,
      username: updated.email.split("@")[0],
      status: updated.active ? "ACTIVE" : "INACTIVE",
    };
  }

  // ── Policies Management ─────────────────────────────────────────────────────
  async findAllPolicies(query: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { policyNumber: { contains: query.q, mode: "insensitive" } },
        { holderName: { contains: query.q, mode: "insensitive" } },
        { vehicleRegistration: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.policy.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        normalizedPolicyNumber: p.normalizedPolicyNumber,
        status: p.status,
        holderName: p.holderName,
        vehicleRegistration: p.vehicleRegistration,
        vehicleMake: p.vehicleMake,
        vehicleModel: p.vehicleModel,
        insurer: p.insurer,
        validFrom: p.validFrom,
        validTo: p.validTo,
        coverageAmount: p.coverageAmount?.toString(),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      page,
      pageSize,
      total,
    };
  }

  async createPolicy(dto: CreatePolicyDto, adminId: string) {
    const normalized = normalizePolicyNumber(dto.policyNumber);

    const existing = await this.prisma.policy.findFirst({
      where: {
        OR: [
          { policyNumber: dto.policyNumber },
          { normalizedPolicyNumber: normalized },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(`Policy ${dto.policyNumber} already exists`);
    }

    const policy = await this.prisma.policy.create({
      data: {
        policyNumber: dto.policyNumber,
        normalizedPolicyNumber: normalized,
        holderName: dto.holderName,
        vehicleRegistration: dto.vehicleRegistration,
        vehicleMake: dto.vehicleMake,
        vehicleModel: dto.vehicleModel,
        insurer: dto.insurer || "Ethio-Insurance Corp",
        status: (dto.status as any) || "ACTIVE",
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        coverageAmount: dto.coverageAmount
          ? new Prisma.Decimal(dto.coverageAmount)
          : null,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: "ADMIN_POLICY_CREATED",
        summary: `Admin created policy ${policy.policyNumber}`,
        details: { policyId: policy.id },
      },
    });

    return {
      id: policy.id,
      policyNumber: policy.policyNumber,
      normalizedPolicyNumber: policy.normalizedPolicyNumber,
      status: policy.status,
      holderName: policy.holderName,
      vehicleRegistration: policy.vehicleRegistration,
      vehicleMake: policy.vehicleMake,
      vehicleModel: policy.vehicleModel,
      insurer: policy.insurer,
      validFrom: policy.validFrom,
      validTo: policy.validTo,
      coverageAmount: policy.coverageAmount?.toString(),
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  async updatePolicy(policyId: string, dto: UpdatePolicyDto, adminId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    const updateData: any = {};
    if (dto.holderName !== undefined) updateData.holderName = dto.holderName;
    if (dto.vehicleRegistration !== undefined)
      updateData.vehicleRegistration = dto.vehicleRegistration;
    if (dto.vehicleMake !== undefined) updateData.vehicleMake = dto.vehicleMake;
    if (dto.vehicleModel !== undefined)
      updateData.vehicleModel = dto.vehicleModel;
    if (dto.insurer !== undefined) updateData.insurer = dto.insurer;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.validFrom !== undefined)
      updateData.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validTo !== undefined)
      updateData.validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (dto.coverageAmount !== undefined) {
      updateData.coverageAmount = dto.coverageAmount
        ? new Prisma.Decimal(dto.coverageAmount)
        : null;
    }

    const updated = await this.prisma.policy.update({
      where: { id: policyId },
      data: updateData,
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: "ADMIN_POLICY_UPDATED",
        summary: `Admin updated policy ${policy.policyNumber}`,
        details: updateData,
      },
    });

    return {
      id: updated.id,
      policyNumber: updated.policyNumber,
      normalizedPolicyNumber: updated.normalizedPolicyNumber,
      status: updated.status,
      holderName: updated.holderName,
      vehicleRegistration: updated.vehicleRegistration,
      vehicleMake: updated.vehicleMake,
      vehicleModel: updated.vehicleModel,
      insurer: updated.insurer,
      validFrom: updated.validFrom,
      validTo: updated.validTo,
      coverageAmount: updated.coverageAmount?.toString(),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdClaims: true,
            assessments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      ...user,
      displayName: user.name,
      username: user.email.split("@")[0],
      status: user.active ? "ACTIVE" : "INACTIVE",
    };
  }

  async resetPassword(userId: string, newPassword: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: "ADMIN_PASSWORD_RESET",
        summary: `Admin reset password for user ${user.email}`,
        details: { targetUserId: user.id },
      },
    });

    return {
      success: true,
      message: `Password reset successfully for ${user.email}`,
    };
  }

  async findPolicyById(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        claims: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            claimNumber: true,
            status: true,
            claimantFullName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    return {
      id: policy.id,
      policyNumber: policy.policyNumber,
      status: policy.status,
      holderName: policy.holderName,
      vehicleRegistration: policy.vehicleRegistration,
      vehicleMake: policy.vehicleMake,
      vehicleModel: policy.vehicleModel,
      insurer: policy.insurer,
      validFrom: policy.validFrom,
      validTo: policy.validTo,
      coverageAmount: policy.coverageAmount?.toString(),
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      claims: policy.claims,
    };
  }

  async getAuditLogs(query: {
    page?: number;
    pageSize?: number;
    actorId?: string;
    claimId?: string;
    action?: string;
    from?: string;
    to?: string;
    q?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.claimId) where.claimId = query.claimId;
    if (query.action) where.action = query.action;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    if (query.q) {
      where.OR = [
        { summary: { contains: query.q, mode: "insensitive" } },
        { action: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          claim: {
            select: {
              id: true,
              claimNumber: true,
            },
          },
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getAnalysisOperations(query?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, query?.page || 1);
    const pageSize = Math.min(50, Math.max(1, query?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status as any;
    }

    const [items, total, countsByStatus] = await Promise.all([
      this.prisma.damageAnalysis.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          evidence: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              storageKey: true,
              publicUrl: true,
              sha256: true,
              phash: true,
              claim: {
                select: {
                  id: true,
                  claimNumber: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.damageAnalysis.count({ where }),
      this.prisma.damageAnalysis.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    for (const group of countsByStatus) {
      statusCounts[group.status] = group._count._all;
    }

    return {
      items: items.map((a) => ({
        id: a.id,
        evidenceId: a.evidenceId,
        status: a.status,
        modelName: a.modelName,
        modelVersion: a.modelVersion,
        inferenceMs: a.inferenceMs,
        errorCode: a.errorCode,
        errorMessage: a.errorMessage,
        retriedAt: a.retriedAt,
        createdAt: a.createdAt,
        evidence: {
          id: a.evidence.id,
          originalName: a.evidence.originalName,
          mimeType: a.evidence.mimeType,
          sizeBytes: Number(a.evidence.sizeBytes),
          publicUrl: a.evidence.publicUrl,
          sha256: a.evidence.sha256,
          phash: a.evidence.phash,
          claimId: a.evidence.claim.id,
          claimNumber: a.evidence.claim.claimNumber,
          claimStatus: a.evidence.claim.status,
        },
      })),
      statusCounts,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
