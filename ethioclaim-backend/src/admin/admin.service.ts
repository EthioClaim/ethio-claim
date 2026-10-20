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
  constructor(private readonly prisma: PrismaService) {}

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
      items,
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
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
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
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_USER_CREATED',
        summary: `Admin created user ${user.email} with role ${user.role}`,
        details: { userId: user.id, role: user.role },
      },
    });

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.active !== undefined) updateData.active = dto.active;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_USER_UPDATED',
        summary: `Admin updated user ${user.email}`,
        details: updateData,
      },
    });

    return updated;
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
        { policyNumber: { contains: query.q, mode: 'insensitive' } },
        { holderName: { contains: query.q, mode: 'insensitive' } },
        { vehicleRegistration: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.policy.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
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
        OR: [{ policyNumber: dto.policyNumber }, { normalizedPolicyNumber: normalized }],
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
        insurer: dto.insurer || 'Ethio-Insurance Corp',
        status: (dto.status as any) || 'ACTIVE',
        coverageAmount: dto.coverageAmount ? new Prisma.Decimal(dto.coverageAmount) : null,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_POLICY_CREATED',
        summary: `Admin created policy ${policy.policyNumber}`,
        details: { policyId: policy.id },
      },
    });

    return {
      id: policy.id,
      policyNumber: policy.policyNumber,
      status: policy.status,
      holderName: policy.holderName,
      vehicleRegistration: policy.vehicleRegistration,
      insurer: policy.insurer,
      createdAt: policy.createdAt,
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
    if (dto.vehicleRegistration !== undefined) updateData.vehicleRegistration = dto.vehicleRegistration;
    if (dto.vehicleMake !== undefined) updateData.vehicleMake = dto.vehicleMake;
    if (dto.vehicleModel !== undefined) updateData.vehicleModel = dto.vehicleModel;
    if (dto.insurer !== undefined) updateData.insurer = dto.insurer;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.coverageAmount !== undefined) {
      updateData.coverageAmount = dto.coverageAmount ? new Prisma.Decimal(dto.coverageAmount) : null;
    }

    const updated = await this.prisma.policy.update({
      where: { id: policyId },
      data: updateData,
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_POLICY_UPDATED',
        summary: `Admin updated policy ${policy.policyNumber}`,
        details: updateData,
      },
    });

    return {
      id: updated.id,
      policyNumber: updated.policyNumber,
      status: updated.status,
      holderName: updated.holderName,
      vehicleRegistration: updated.vehicleRegistration,
      insurer: updated.insurer,
      updatedAt: updated.updatedAt,
    };
  }
}
