import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  async getSummary(userId: string, role: string, from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (role === "INTAKE_USER") {
      where.createdById = userId;
    }

    // Get counts grouped by status
    const statusGroups = await this.prisma.claim.groupBy({
      by: ["status"],
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
      (countsByStatus["SUBMITTED"] || 0) +
      (countsByStatus["READY_FOR_REVIEW"] || 0) +
      (countsByStatus["UNDER_REVIEW"] || 0);

    // Recent claims
    const recentClaims = await this.prisma.claim.findMany({
      where,
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        claimantFullName: true,
        vehiclePlateNumber: true,
        createdAt: true,
      },
    });

    // Role-specific operational telemetry
    let adminMetrics: any = null;
    let intakeMetrics: any = null;
    let examinerMetrics: any = null;

    if (role === "ADMIN") {
      const [activePolicies, expiredPolicies, failedAnalyses] =
        await Promise.all([
          this.prisma.policy.count({ where: { status: "ACTIVE" } }),
          this.prisma.policy.count({ where: { status: "EXPIRED" } }),
          this.prisma.damageAnalysis.count({ where: { status: "FAILED" } }),
        ]);

      adminMetrics = {
        activePolicies,
        expiredPolicies,
        totalPolicies: activePolicies + expiredPolicies,
        failedAnalyses,
        unassignedClaims:
          (countsByStatus["SUBMITTED"] || 0) +
          (countsByStatus["READY_FOR_REVIEW"] || 0),
      };
    } else if (role === "INTAKE_USER") {
      intakeMetrics = {
        draftsCount: countsByStatus["DRAFT"] || 0,
        submittedCount: countsByStatus["SUBMITTED"] || 0,
        needsMoreInfoCount: countsByStatus["NEED_MORE_EVIDENCE"] || 0,
        underReviewCount:
          (countsByStatus["UNDER_REVIEW"] || 0) +
          (countsByStatus["ASSESSED"] || 0),
      };
    } else if (role === "EXAMINER") {
      const [assessedByMe, failedAnalyses] = await Promise.all([
        this.prisma.examinerAssessment.count({ where: { examinerId: userId } }),
        this.prisma.damageAnalysis.count({ where: { status: "FAILED" } }),
      ]);

      examinerMetrics = {
        assignedQueueCount: countsByStatus["UNDER_REVIEW"] || 0,
        awaitingReviewCount:
          (countsByStatus["SUBMITTED"] || 0) +
          (countsByStatus["READY_FOR_REVIEW"] || 0),
        infoRequestedCount: countsByStatus["NEED_MORE_EVIDENCE"] || 0,
        completedAssessmentsCount: assessedByMe,
        failedAnalysisCount: failedAnalyses,
      };
    }

    return {
      role,
      countsByStatus,
      needsReview,
      totalClaims,
      recentClaims,
      adminMetrics,
      intakeMetrics,
      examinerMetrics,
    };
  }
}
