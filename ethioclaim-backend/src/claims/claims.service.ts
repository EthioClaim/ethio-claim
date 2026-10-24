import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateClaimDto,
  UpdateClaimDto,
  UpdateClaimStatusDto,
  AssignExaminerDto,
  CloseClaimDto,
  SubmitClaimDto,
  RequestEvidenceDto,
} from "./dto/claims.dto";

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["PROCESSING", "POLICY_UNVERIFIED", "UNDER_REVIEW"],
  POLICY_UNVERIFIED: ["SUBMITTED"],
  PROCESSING: ["READY_FOR_REVIEW", "NEED_MORE_EVIDENCE"],
  READY_FOR_REVIEW: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["ASSESSED", "NEED_MORE_EVIDENCE", "READY_FOR_REVIEW"],
  NEED_MORE_EVIDENCE: ["UNDER_REVIEW", "READY_FOR_REVIEW"],
  ASSESSED: ["APPROVED", "REJECTED", "UNDER_REVIEW"],
  APPROVED: ["CLOSED"],
  REJECTED: ["CLOSED"],
  CLOSED: [],
};

function formatClaim(c: any) {
  const assignEvent = c.auditEvents?.find(
    (e: any) => e.action === "EXAMINER_ASSIGNED",
  );
  const assignedExaminer = assignEvent?.details
    ? {
        id: (assignEvent.details as any).examinerId,
        name: (assignEvent.details as any).examinerName,
      }
    : c.assessment?.examiner
      ? {
          id: c.assessment.examiner.id,
          name: c.assessment.examiner.name,
        }
      : null;

  // Extract AI detections and risk assessment if evidence list is present
  let aiSuggestedSeverity: string | null = null;
  let aiRiskAssessment: any = null;
  const allDetections: any[] = [];
  const fraudReasons: string[] = [];
  let isFraudFlag = false;
  let hasPending = false;
  let hasFailed = false;

  const fraudEvent = c.auditEvents?.find(
    (e: any) => e.action === "AI_POTENTIAL_FRAUD_FLAGGED",
  );
  if (fraudEvent) {
    isFraudFlag = true;
    if (fraudEvent.details?.riskAssessment?.reasons) {
      fraudReasons.push(...fraudEvent.details.riskAssessment.reasons);
    } else if (fraudEvent.summary) {
      fraudReasons.push(fraudEvent.summary);
    }
  }

  if (Array.isArray(c.evidence)) {
    for (const ev of c.evidence) {
      if (
        ev.analysisStatus === "PENDING" ||
        ev.analysisStatus === "PROCESSING"
      ) {
        hasPending = true;
      }
      if (ev.analysisStatus === "FAILED") {
        hasFailed = true;
      }

      const det = ev.analysis?.detections as any;
      if (det) {
        const damageDetections = Array.isArray(det)
          ? det
          : Array.isArray(det.damageDetections)
            ? det.damageDetections
            : [];
        allDetections.push(...damageDetections);

        if (det.riskAssessment?.label === "POTENTIAL_FRAUD") {
          isFraudFlag = true;
          if (Array.isArray(det.riskAssessment.reasons)) {
            fraudReasons.push(...det.riskAssessment.reasons);
          }
        }
      }
    }
  }

  // Derive aiSuggestedSeverity from detections (SEVERE > MODERATE > MINOR)
  const severityLevels = allDetections.map((d: any) =>
    (d.severity || "").toUpperCase(),
  );
  if (severityLevels.includes("SEVERE")) {
    aiSuggestedSeverity = "SEVERE";
  } else if (severityLevels.includes("MODERATE")) {
    aiSuggestedSeverity = "MODERATE";
  } else if (severityLevels.includes("MINOR")) {
    aiSuggestedSeverity = "MINOR";
  }

  const matchedClaimIds: string[] = [];
  const matchedEvidenceIds: string[] = [];
  let riskScore: number | null = null;

  if (fraudEvent?.details) {
    if (Array.isArray((fraudEvent.details as any).matchedClaimIds)) {
      matchedClaimIds.push(...(fraudEvent.details as any).matchedClaimIds);
    }
    if (Array.isArray((fraudEvent.details as any).matchedEvidenceIds)) {
      matchedEvidenceIds.push(
        ...(fraudEvent.details as any).matchedEvidenceIds,
      );
    }
    if ((fraudEvent.details as any).riskAssessment?.score != null) {
      riskScore = (fraudEvent.details as any).riskAssessment.score;
    }
  }

  if (Array.isArray(c.evidence)) {
    for (const ev of c.evidence) {
      const det = ev.analysis?.detections as any;
      if (det?.riskAssessment?.matchedClaimIds) {
        matchedClaimIds.push(...det.riskAssessment.matchedClaimIds);
      }
      if (det?.riskAssessment?.matchedEvidenceIds) {
        matchedEvidenceIds.push(...det.riskAssessment.matchedEvidenceIds);
      }
      if (det?.riskAssessment?.score != null && riskScore == null) {
        riskScore = det.riskAssessment.score;
      }
    }
  }

  // Derive aiRiskAssessment
  if (isFraudFlag) {
    aiRiskAssessment = {
      label: "POTENTIAL_FRAUD",
      requiresExaminerReview: true,
      score: riskScore ?? 0.95,
      matchedClaimIds: Array.from(new Set(matchedClaimIds)),
      matchedEvidenceIds: Array.from(new Set(matchedEvidenceIds)),
      reasons: Array.from(
        new Set(
          fraudReasons.length
            ? fraudReasons
            : ["Potential duplicate or visual anomaly detected"],
        ),
      ),
    };
  } else if (hasPending) {
    aiRiskAssessment = {
      label: "PENDING",
      requiresExaminerReview: false,
      score: 0.1,
      matchedClaimIds: [],
      matchedEvidenceIds: [],
      reasons: ["AI damage analysis and duplicate verification in progress"],
    };
  } else if (hasFailed) {
    aiRiskAssessment = {
      label: "FAILED",
      requiresExaminerReview: true,
      score: 0.5,
      matchedClaimIds: [],
      matchedEvidenceIds: [],
      reasons: [
        "One or more photos could not be processed by the vision model",
      ],
    };
  } else if (c.evidence && c.evidence.length > 0) {
    aiRiskAssessment = {
      label: "NO_FRAUD_INDICATORS_FOUND",
      requiresExaminerReview: false,
      score: 0.05,
      matchedClaimIds: [],
      matchedEvidenceIds: [],
      reasons: ["No duplicate hashes or cross-claim anomalies identified"],
    };
  }

  const claimantName = c.claimantFullName || "Unknown Claimant";

  return {
    id: c.id,
    claimNumber: c.claimNumber,
    status: c.status,
    policyVerification: c.policyVerification,
    claimant: {
      name: claimantName,
      fullName: claimantName,
      phone: c.claimantPhone || "—",
      email: c.claimantEmail,
    },
    claimantName,
    claimantFullName: claimantName,
    vehicle: {
      plateNumber: c.vehiclePlateNumber,
      plate: c.vehiclePlateNumber,
      make: c.vehicleMake,
      model: c.vehicleModel,
      year: c.vehicleYear,
      vin: c.vehicleVin,
    },
    incident: {
      occurredAt: c.incidentOccurredAt,
      incidentDate: c.incidentOccurredAt,
      location: c.incidentLocation,
      description: c.incidentDescription,
      incidentType: c.incidentType,
    },
    incidentDate: c.incidentOccurredAt,
    description: c.incidentDescription,
    policy: c.policy
      ? {
          id: c.policy.id,
          policyNumber: c.policy.policyNumber,
          status: c.policy.status,
          insurer: c.policy.insurer,
        }
      : null,
    policyNumber: c.policy?.policyNumber,
    evidenceCount: c._count?.evidence ?? (c.evidence ? c.evidence.length : 0),
    assignedExaminer,
    aiSuggestedSeverity,
    aiRiskAssessment,
    evidence: c.evidence
      ? c.evidence.map((ev: any) => ({
          id: ev.id,
          claimId: ev.claimId,
          originalName: ev.originalName,
          filename: ev.originalName,
          originalFilename: ev.originalName,
          mimeType: ev.mimeType,
          sizeBytes: Number(ev.sizeBytes),
          storageKey: ev.storageKey,
          publicUrl: `/api/v1/evidence/${ev.id}/file`,
          url: `/api/v1/evidence/${ev.id}/file`,
          thumbnailUrl: `/api/v1/evidence/${ev.id}/file`,
          sha256: ev.sha256,
          phash: ev.phash,
          caption: ev.caption,
          evidenceType: ev.evidenceType,
          analysisStatus: ev.analysisStatus,
          uploadedById: ev.uploadedById,
          uploadedAt: ev.createdAt,
          createdAt: ev.createdAt,
          analysis: ev.analysis
            ? {
                id: ev.analysis.id,
                status: ev.analysis.status,
                modelName: ev.analysis.modelName,
                modelVersion: ev.analysis.modelVersion,
                detections:
                  (ev.analysis.detections as any)?.damageDetections ||
                  (Array.isArray(ev.analysis.detections)
                    ? ev.analysis.detections
                    : []),
                riskAssessment:
                  (ev.analysis.detections as any)?.riskAssessment || null,
                warnings: (ev.analysis.detections as any)?.warnings || [],
                inferenceMs: ev.analysis.inferenceMs,
                errorCode: ev.analysis.errorCode,
                errorMessage: ev.analysis.errorMessage,
              }
            : null,
          matches: ev.matchedBy
            ? ev.matchedBy.map((m: any) => ({
                id: m.id,
                matchedEvidenceId: m.matchedEvidenceId,
                matchType: m.matchType,
                score: m.score ? Number(m.score) : undefined,
                distance: m.distance,
                matchedClaimId: m.matchedEvidence?.claimId,
                matchedClaimNumber: m.matchedEvidence?.claim?.claimNumber,
              }))
            : [],
        }))
      : undefined,
    assessment: c.assessment
      ? {
          id: c.assessment.id,
          severity: c.assessment.severity,
          estimatedLossEtb: c.assessment.estimatedLossEtb?.toString(),
          currency: c.assessment.currency,
          notes: c.assessment.notes,
          examinerId: c.assessment.examinerId,
          examiner: c.assessment.examiner
            ? {
                id: c.assessment.examiner.id,
                name: c.assessment.examiner.name,
              }
            : undefined,
          createdAt: c.assessment.createdAt,
        }
      : null,
    decisions: c.decisions,
    timeline: c.auditEvents
      ? c.auditEvents.map((a: any) => ({
          id: a.id,
          claimId: a.claimId,
          action: a.action,
          summary: a.summary,
          details: a.details,
          actor: a.actor
            ? {
                id: a.actor.id,
                name: a.actor.name,
                role: a.actor.role,
                email: a.actor.email,
              }
            : a.actorId,
          createdAt: a.createdAt,
        }))
      : undefined,
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
    const seq = String(count + 1).padStart(5, "0");
    return `EC-${year}-${seq}`;
  }

  async create(dto: CreateClaimDto, userId: string) {
    // Verify policy if policyNumber provided
    let policyId: string | undefined;
    let policyVerification = "PENDING";

    if (dto.policyNumber) {
      const normalized = dto.policyNumber.replace(/[-\s]/g, "").toUpperCase();
      const policy = await this.prisma.policy.findFirst({
        where: {
          OR: [
            { policyNumber: { equals: dto.policyNumber, mode: "insensitive" } },
            { normalizedPolicyNumber: normalized },
          ],
        },
      });
      if (policy) {
        policyId = policy.id;
        policyVerification =
          policy.status === "ACTIVE" ? "VERIFIED" : "POLICY_INACTIVE";
      } else {
        policyVerification = "NOT_FOUND";
      }
    }

    const claimNumber = await this.generateClaimNumber();

    const claim = await this.prisma.claim.create({
      data: {
        claimNumber,
        status:
          (dto as any).status ||
          (policyVerification === "VERIFIED" ? "DRAFT" : "POLICY_UNVERIFIED"),
        policyVerification,
        policyId,
        claimantFullName:
          dto.claimant?.fullName ||
          (dto as any).claimantName ||
          "Unknown Claimant",
        claimantPhone: dto.claimant?.phone || (dto as any).claimantPhone || "",
        claimantEmail: dto.claimant?.email || (dto as any).claimantEmail,
        vehiclePlateNumber:
          dto.vehicle?.plateNumber ||
          (dto as any).vehiclePlate ||
          (dto as any).vehicleRegistration,
        vehicleMake: dto.vehicle?.make || (dto as any).vehicleMake,
        vehicleModel: dto.vehicle?.model || (dto as any).vehicleModel,
        vehicleYear: dto.vehicle?.year || (dto as any).vehicleYear,
        vehicleVin: dto.vehicle?.vin || (dto as any).vehicleVin,
        incidentOccurredAt:
          dto.incident?.occurredAt || (dto as any).incidentDate
            ? new Date(dto.incident?.occurredAt || (dto as any).incidentDate)
            : undefined,
        incidentLocation: dto.incident?.location || (dto as any).location,
        incidentDescription:
          dto.incident?.description || (dto as any).description,
        incidentType:
          (dto.incident?.incidentType as any) ||
          (dto as any).incidentType ||
          "OTHER",
        createdById: userId,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId: claim.id,
        actorId: userId,
        action: "CLAIM_CREATED",
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

  async isClaimAssignedToExaminer(
    claimId: string,
    examinerId: string,
  ): Promise<boolean> {
    // 1. Check latest EXAMINER_ASSIGNED audit event
    const latestAssign = await this.prisma.auditEvent.findFirst({
      where: {
        claimId,
        action: "EXAMINER_ASSIGNED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestAssign && latestAssign.details) {
      const details = latestAssign.details as any;
      if (details.examinerId) {
        return details.examinerId === examinerId;
      }
    }

    // 2. Check assessment examiner
    const assessment = await this.prisma.examinerAssessment.findUnique({
      where: { claimId },
      select: { examinerId: true },
    });

    if (assessment) {
      return assessment.examinerId === examinerId;
    }

    return false;
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
    if (userRole === "INTAKE_USER") {
      where.createdById = userId;
    } else if (userRole === "EXAMINER") {
      // Find all claims assigned to this examiner
      // 1. Claims with assessment by this examiner
      const assessedClaims = await this.prisma.examinerAssessment.findMany({
        where: { examinerId: userId },
        select: { claimId: true },
      });
      const assessedClaimIds = assessedClaims.map((a) => a.claimId);

      // 2. Claims with EXAMINER_ASSIGNED audit events
      const assignEvents = await this.prisma.auditEvent.findMany({
        where: { action: "EXAMINER_ASSIGNED" },
        orderBy: { createdAt: "desc" },
        select: { claimId: true, details: true },
      });

      // Track latest assignment per claim
      const claimLatestAssignMap = new Map<string, string>();
      for (const ev of assignEvents) {
        if (ev.claimId && !claimLatestAssignMap.has(ev.claimId)) {
          const det = ev.details as any;
          if (det?.examinerId) {
            claimLatestAssignMap.set(ev.claimId, det.examinerId);
          }
        }
      }

      const assignedEventClaimIds: string[] = [];
      for (const [cId, exId] of claimLatestAssignMap.entries()) {
        if (exId === userId) {
          assignedEventClaimIds.push(cId);
        }
      }

      const allAssignedIds = Array.from(
        new Set([...assessedClaimIds, ...assignedEventClaimIds]),
      );
      where.id = { in: allAssignedIds };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      where.OR = [
        { claimNumber: { contains: query.q, mode: "insensitive" } },
        { claimantFullName: { contains: query.q, mode: "insensitive" } },
        { vehiclePlateNumber: { contains: query.q, mode: "insensitive" } },
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
        orderBy: { createdAt: "desc" },
        include: {
          policy: true,
          assessment: {
            include: {
              examiner: {
                select: { id: true, name: true, role: true },
              },
            },
          },
          auditEvents: {
            where: { action: "EXAMINER_ASSIGNED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          evidence: {
            where: { deletedAt: null },
            include: {
              analysis: true,
              matchedBy: {
                include: {
                  matchedEvidence: {
                    select: {
                      id: true,
                      claimId: true,
                      claim: { select: { claimNumber: true } },
                    },
                  },
                },
              },
            },
          },
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
        assessment: {
          include: {
            examiner: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        auditEvents: {
          orderBy: { createdAt: "desc" },
          include: {
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        evidence: {
          where: { deletedAt: null },
          include: {
            analysis: true,
            matchedBy: {
              include: {
                matchedEvidence: {
                  select: {
                    id: true,
                    claimId: true,
                    claim: { select: { claimNumber: true } },
                  },
                },
              },
            },
          },
        },
        decisions: {
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { evidence: true } },
      },
    });

    if (!claim) throw new NotFoundException("Claim not found");

    if (userRole === "INTAKE_USER" && claim.createdById !== userId) {
      throw new ForbiddenException("Access denied to this claim");
    }

    if (userRole === "EXAMINER") {
      const isAssigned = await this.isClaimAssignedToExaminer(claimId, userId);
      if (!isAssigned) {
        throw new ForbiddenException(
          "Access denied: this claim is not assigned to you",
        );
      }

      // Automatically transition eligible assigned claims to UNDER_REVIEW upon examiner inspection
      if (
        ["SUBMITTED", "READY_FOR_REVIEW", "PROCESSING"].includes(claim.status)
      ) {
        const previousStatus = claim.status;
        await this.prisma.claim.update({
          where: { id: claimId },
          data: { status: "UNDER_REVIEW" },
        });
        await this.prisma.auditEvent.create({
          data: {
            claimId,
            actorId: userId,
            action: "STATUS_CHANGED",
            summary: `Claim transitioned to UNDER_REVIEW upon examiner review`,
            details: { previousStatus, newStatus: "UNDER_REVIEW" },
          },
        });
        claim.status = "UNDER_REVIEW";
      }
    }

    return formatClaim(claim);
  }

  async submit(
    claimId: string,
    dto: SubmitClaimDto,
    userId: string,
    userRole: string,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { policy: true },
    });

    if (!claim) throw new NotFoundException("Claim not found");

    if (userRole === "INTAKE_USER" && claim.createdById !== userId) {
      throw new ForbiddenException("Access denied to submit this claim");
    }

    if (claim.status !== "DRAFT" && claim.status !== "POLICY_UNVERIFIED") {
      throw new ConflictException(`Claim is already in ${claim.status} status`);
    }

    let policyVerification = claim.policyVerification;
    if (claim.policy) {
      if (claim.policy.status !== "ACTIVE") {
        throw new ConflictException(
          `Cannot submit claim: Policy is ${claim.policy.status}`,
        );
      }
      if (claim.policy.validTo && new Date(claim.policy.validTo) < new Date()) {
        throw new ConflictException("Cannot submit claim: Policy has expired");
      }
      policyVerification = "VERIFIED";
    }

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status: "SUBMITTED",
        policyVerification,
      },
      include: {
        policy: true,
        assessment: {
          include: {
            examiner: { select: { id: true, name: true, role: true } },
          },
        },
        auditEvents: {
          where: { action: "EXAMINER_ASSIGNED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { evidence: true } },
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: "CLAIM_SUBMITTED",
        summary: `Claim ${claim.claimNumber} submitted for adjudication`,
        details: { confirmationNotes: dto.confirmationNotes },
      },
    });

    return formatClaim(updated);
  }

  async assignExaminer(
    claimId: string,
    dto: AssignExaminerDto,
    adminId: string,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) throw new NotFoundException("Claim not found");

    const examiner = await this.prisma.user.findUnique({
      where: { id: dto.examinerId },
    });

    if (!examiner) throw new NotFoundException("Examiner not found");
    if (examiner.role !== "EXAMINER" && examiner.role !== "ADMIN") {
      throw new ConflictException("Selected user is not an examiner");
    }

    let newStatus = claim.status;
    if (["SUBMITTED", "READY_FOR_REVIEW"].includes(claim.status)) {
      newStatus = "UNDER_REVIEW";
      await this.prisma.claim.update({
        where: { id: claimId },
        data: { status: "UNDER_REVIEW" },
      });
    }

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: adminId,
        action: "EXAMINER_ASSIGNED",
        summary: `Claim assigned to examiner ${examiner.name}`,
        details: {
          examinerId: examiner.id,
          examinerName: examiner.name,
          examinerEmail: examiner.email,
          note: dto.note,
        },
      },
    });

    return {
      claimId,
      status: newStatus,
      assignedExaminer: {
        id: examiner.id,
        name: examiner.name,
        email: examiner.email,
      },
    };
  }

  async close(claimId: string, dto: CloseClaimDto, adminId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) throw new NotFoundException("Claim not found");

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: { status: "CLOSED" },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: adminId,
        action: "CLAIM_CLOSED",
        summary: `Claim closed: ${dto.reason}`,
        details: { reason: dto.reason, notes: dto.notes },
      },
    });

    return {
      id: claimId,
      status: updated.status,
      reason: dto.reason,
    };
  }

  async update(
    claimId: string,
    dto: UpdateClaimDto,
    userId: string,
    userRole: string,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) throw new NotFoundException("Claim not found");

    if (userRole === "INTAKE_USER" && claim.createdById !== userId) {
      throw new ForbiddenException("Access denied");
    }

    // INTAKE_USER can only edit before review
    if (
      userRole === "INTAKE_USER" &&
      ["UNDER_REVIEW", "ASSESSED", "APPROVED", "REJECTED", "CLOSED"].includes(
        claim.status,
      )
    ) {
      throw new ConflictException(
        "Claim cannot be edited in its current status",
      );
    }

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        ...(dto.claimant?.fullName && {
          claimantFullName: dto.claimant.fullName,
        }),
        ...(dto.claimant?.phone !== undefined && {
          claimantPhone: dto.claimant.phone,
        }),
        ...(dto.claimant?.email !== undefined && {
          claimantEmail: dto.claimant.email,
        }),
        ...(dto.vehicle?.plateNumber !== undefined && {
          vehiclePlateNumber: dto.vehicle.plateNumber,
        }),
        ...(dto.vehicle?.make !== undefined && {
          vehicleMake: dto.vehicle.make,
        }),
        ...(dto.vehicle?.model !== undefined && {
          vehicleModel: dto.vehicle.model,
        }),
        ...(dto.vehicle?.year !== undefined && {
          vehicleYear: dto.vehicle.year,
        }),
        ...(dto.vehicle?.vin !== undefined && { vehicleVin: dto.vehicle.vin }),
        ...(dto.incident?.occurredAt && {
          incidentOccurredAt: new Date(dto.incident.occurredAt),
        }),
        ...(dto.incident?.location !== undefined && {
          incidentLocation: dto.incident.location,
        }),
        ...(dto.incident?.description !== undefined && {
          incidentDescription: dto.incident.description,
        }),
        ...(dto.incident?.incidentType !== undefined && {
          incidentType: dto.incident.incidentType as any,
        }),
      },
      include: {
        policy: true,
        assessment: {
          include: {
            examiner: { select: { id: true, name: true, role: true } },
          },
        },
        auditEvents: {
          where: { action: "EXAMINER_ASSIGNED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { evidence: true } },
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: "CLAIM_UPDATED",
        summary: "Claim intake fields updated",
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
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) throw new NotFoundException("Claim not found");

    if (userRole === "INTAKE_USER") {
      // Intake users can only submit (DRAFT -> SUBMITTED)
      if (claim.status !== "DRAFT" || dto.status !== "SUBMITTED") {
        throw new ForbiddenException(
          "Intake users can only submit draft claims",
        );
      }
    }

    if (userRole === "EXAMINER") {
      const isAssigned = await this.isClaimAssignedToExaminer(claimId, userId);
      if (!isAssigned) {
        throw new ForbiddenException(
          "Access denied: this claim is not assigned to you",
        );
      }
      // Examiners cannot arbitrarily approve, reject, or close without decision endpoint
      if (["APPROVED", "REJECTED", "CLOSED"].includes(dto.status)) {
        throw new ForbiddenException(
          "Final decisions must be recorded via the decision action",
        );
      }
    }

    const allowed = ALLOWED_TRANSITIONS[claim.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Claim cannot move from ${claim.status} to ${dto.status}. Allowed: ${allowed.join(", ")}`,
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
        action: "STATUS_CHANGED",
        summary: `Status changed from ${claim.status} to ${dto.status}${dto.note ? ": " + dto.note : ""}`,
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
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) throw new NotFoundException("Claim not found");

    if (userRole === "INTAKE_USER" && claim.createdById !== userId) {
      throw new ForbiddenException("Access denied");
    }

    const events = await this.prisma.auditEvent.findMany({
      where: { claimId },
      orderBy: { createdAt: "asc" },
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

  async startReview(claimId: string, userId: string, userRole: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) throw new NotFoundException("Claim not found");

    if (userRole === "EXAMINER") {
      const isAssigned = await this.isClaimAssignedToExaminer(claimId, userId);
      if (!isAssigned) {
        throw new ForbiddenException(
          "Access denied: this claim is not assigned to you",
        );
      }
    }

    if (claim.status === "UNDER_REVIEW") {
      return { id: claimId, status: "UNDER_REVIEW", alreadyUnderReview: true };
    }

    if (["ASSESSED", "APPROVED", "REJECTED", "CLOSED"].includes(claim.status)) {
      return {
        id: claimId,
        status: claim.status,
        message: "Claim is in a later review stage",
      };
    }

    const previousStatus = claim.status;
    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: { status: "UNDER_REVIEW" },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: "STATUS_CHANGED",
        summary: `Status transitioned from ${previousStatus} to UNDER_REVIEW upon examiner review`,
        details: { previousStatus, newStatus: "UNDER_REVIEW" },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      previousStatus,
    };
  }

  async requestEvidence(
    claimId: string,
    dto: RequestEvidenceDto,
    userId: string,
    userRole?: string,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) throw new NotFoundException("Claim not found");

    if (userRole === "EXAMINER") {
      const isAssigned = await this.isClaimAssignedToExaminer(claimId, userId);
      if (!isAssigned) {
        throw new ForbiddenException(
          "Access denied: this claim is not assigned to you",
        );
      }
    }

    const message =
      dto.message?.trim() ||
      (dto.notes?.trim()
        ? `${dto.item?.trim() || "Evidence"} - ${dto.notes.trim()}`
        : dto.item?.trim()) ||
      "Additional evidence requested";

    const requestedItems =
      dto.requestedItems || (dto.item ? [dto.item.trim()] : []);

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: { status: "NEED_MORE_EVIDENCE" },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: "EVIDENCE_REQUESTED",
        summary: message,
        details: {
          message,
          requestedItems,
          item: dto.item,
          notes: dto.notes,
          deadline: dto.deadline,
        },
      },
    });

    return {
      id: claimId,
      claimId,
      status: updated.status,
      message,
      requestedItems,
    };
  }
}
