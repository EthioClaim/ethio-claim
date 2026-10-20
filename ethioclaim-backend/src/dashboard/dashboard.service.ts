import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, role: string, from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (role === 'INTAKE_USER') {
      where.createdById = userId;
    }

    // Get counts grouped by status
    const statusGroups = await this.prisma.claim.groupBy({
      by: ['status'],
      where,
      _count: {
        _all: true,
      },
    });

    const countsByStatus: Record<string, number> = {};
    let totalClaims = 0;
    for (const group of statusGroups) {
      countsByStatus[group.status] = group._count._all;
      totalClaims += group._count._all;
    }

    // Needs review count
    const needsReview =
      (countsByStatus['SUBMITTED'] || 0) +
      (countsByStatus['READY_FOR_REVIEW'] || 0) +
      (countsByStatus['UNDER_REVIEW'] || 0);

    // Recent claims
    const recentClaims = await this.prisma.claim.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        claimantFullName: true,
        vehiclePlateNumber: true,
        createdAt: true,
      },
    });

    return {
      countsByStatus,
      needsReview,
      totalClaims,
      recentClaims,
    };
  }
}
