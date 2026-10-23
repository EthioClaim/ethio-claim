import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
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
   * Enforces that an examiner can only assess, view, or decide on claims assigned to them.
   */
  private async verifyExaminerAccess(claimId: string, userId: string, role: string) {
    if (role === 'ADMIN') return;
    if (role !== 'EXAMINER') {
      throw new ForbiddenException('Only examiners and admins can assess or decide claims');
    }

    // 1. Check latest EXAMINER_ASSIGNED audit event
    const latestAssign = await this.prisma.auditEvent.findFirst({
      where: { claimId, action: 'EXAMINER_ASSIGNED' },
      orderBy: { createdAt: 'desc' },
    });
    if (latestAssign && latestAssign.details) {
      const details = latestAssign.details as any;
      if (details.examinerId === userId) return;
    }

    // 2. Check assessment
    const assessment = await this.prisma.examinerAssessment.findUnique({
      where: { claimId },
      select: { examinerId: true },
    });
    if (assessment && assessment.examinerId === userId) return;

    throw new ForbiddenException('Access denied: this claim is not assigned to you');
  }

  /**
   * Create examiner assessment for a claim
   */
  async create(claimId: string, dto: CreateAssessmentDto, examinerId: string, role: string) {
    await this.verifyExaminerAccess(claimId, examinerId, role);

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

    // Automatically transition status to ASSESSED upon assessment submission
    if (!['APPROVED', 'REJECTED', 'CLOSED'].includes(claim.status)) {
      const previousStatus = claim.status;
      await this.prisma.claim.update({
        where: { id: claimId },
        data: { status: 'ASSESSED' },
      });

      await this.prisma.auditEvent.create({
        data: {
          claimId,
          actorId: examinerId,
          action: 'STATUS_CHANGED',
          summary: `Claim transitioned from ${previousStatus} to ASSESSED upon examiner assessment`,
          details: { previousStatus, newStatus: 'ASSESSED' },
        },
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

    if (role === 'EXAMINER') {
      await this.verifyExaminerAccess(claimId, userId, role);
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
    await this.verifyExaminerAccess(claimId, userId, role);

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
    await this.verifyExaminerAccess(claimId, actorId, role);

    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        auditEvents: { where: { action: 'AI_POTENTIAL_FRAUD_FLAGGED' } },
        evidence: { include: { analysis: true } },
      },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }

    // Check if fraud flag exists
    const hasFraudFlag = claim.auditEvents && claim.auditEvents.length > 0;
    if (hasFraudFlag) {
      if (!dto.reason || dto.reason.trim().length < 5) {
        throw new BadRequestException(
          'This claim has an AI potential fraud flag. Examiner must review the flag and provide a detailed reason for the final decision.',
        );
      }

      await this.prisma.auditEvent.create({
        data: {
          claimId,
          actorId,
          action: 'AI_FLAG_ACKNOWLEDGED',
          summary: `Examiner acknowledged AI fraud flag with decision: ${dto.decision}`,
          details: { decision: dto.decision, reason: dto.reason },
        },
      });
    }

    // Check if any evidence is still pending analysis
    const isAiPending = claim.evidence?.some(
      (ev) => ev.analysisStatus === 'PENDING' || ev.analysis?.status === 'PENDING',
    );
    if (isAiPending) {
      await this.prisma.auditEvent.create({
        data: {
          claimId,
          actorId,
          action: 'AI_ANALYSIS_BYPASSED',
          summary: `Examiner finalized claim decision while AI analysis was pending: ${dto.decision}`,
          details: { decision: dto.decision, reason: dto.reason },
        },
      });
    }

    const decision = await this.prisma.claimDecision.create({
      data: {
        claimId,
        decision: dto.decision,
        reason: dto.reason,
        actorId,
      },
    });

    // Update claim status based on decision outcome
    let nextStatus = claim.status;
    if (dto.decision === 'RECOMMEND_APPROVAL' || dto.decision === 'APPROVE') {
      nextStatus = 'APPROVED';
    } else if (dto.decision === 'RECOMMEND_REJECTION' || dto.decision === 'REJECT') {
      nextStatus = 'REJECTED';
    } else if (dto.decision === 'ADDITIONAL_DOCUMENTS_REQUIRED' || dto.decision === 'REQUEST_MORE_EVIDENCE') {
      nextStatus = 'NEED_MORE_EVIDENCE';
    }

    if (nextStatus !== claim.status) {
      await this.prisma.claim.update({
        where: { id: claimId },
        data: { status: nextStatus },
      });
      await this.prisma.auditEvent.create({
        data: {
          claimId,
          actorId,
          action: 'STATUS_CHANGED',
          summary: `Claim status updated from ${claim.status} to ${nextStatus}`,
          details: { from: claim.status, to: nextStatus, decision: dto.decision },
        },
      });
    }

    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId,
        action: 'DECISION_RECORDED',
        summary: `Decision recorded: ${dto.decision}`,
        details: { decisionId: decision.id, reason: dto.reason, outcomeStatus: nextStatus },
      },
    });

    return {
      id: decision.id,
      claimId: decision.claimId,
      decision: decision.decision,
      reason: decision.reason,
      actorId: decision.actorId,
      status: nextStatus,
      createdAt: decision.createdAt,
    };
  }
}
