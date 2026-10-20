import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { UploadEvidenceDto, ReanalyzeDto } from './dto/evidence.dto';
import * as crypto from 'crypto';

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Helper to verify claim access for the user
   */
  private async verifyClaimAccess(claimId: string, userId: string, role: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }
    if (role === 'INTAKE_USER' && claim.createdById !== userId) {
      throw new ForbiddenException('Access to this claim is restricted');
    }
    return claim;
  }

  /**
   * Helper to generate a perceptual hash (simulated 16-hex characters)
   */
  private generatePhash(buffer: Buffer): string {
    const hash = crypto.createHash('md5').update(buffer.subarray(0, Math.min(buffer.length, 1024))).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Upload an evidence image, store on S3, compute SHA-256, and trigger damage analysis
   */
  async uploadEvidence(
    claimId: string,
    file: Express.Multer.File,
    dto: UploadEvidenceDto,
    userId: string,
    userRole: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid file must be provided');
    }

    const claim = await this.verifyClaimAccess(claimId, userId, userRole);

    // 1. Compute SHA-256 hash and upload to S3
    const sha256 = this.storageService.computeSha256(file.buffer);
    const { storageKey, publicUrl } = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      claimId,
    );
    const phash = this.generatePhash(file.buffer);

    // 2. Persist Evidence record
    const evidence = await this.prisma.evidence.create({
      data: {
        claimId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        storageKey,
        publicUrl,
        sha256,
        phash,
        caption: dto.caption,
        evidenceType: dto.evidenceType || 'VEHICLE_DAMAGE_PHOTO',
        analysisStatus: 'PENDING',
        uploadedById: userId,
      },
    });

    // 3. Check for exact duplicate hash across other claims (fraud / duplicate detection)
    const duplicateEvidence = await this.prisma.evidence.findFirst({
      where: {
        sha256,
        id: { not: evidence.id },
        deletedAt: null,
      },
      include: {
        claim: true,
      },
    });

    if (duplicateEvidence) {
      await this.prisma.similarityMatch.create({
        data: {
          sourceEvidenceId: evidence.id,
          matchedEvidenceId: duplicateEvidence.id,
          matchType: 'EXACT_HASH',
          score: 1.0,
          distance: 0,
        },
      });
      this.logger.warn(`Exact duplicate detected! Evidence ${evidence.id} matches ${duplicateEvidence.id}`);
    }

    // 4. Create initial DamageAnalysis record
    await this.prisma.damageAnalysis.create({
      data: {
        evidenceId: evidence.id,
        status: 'PENDING',
      },
    });

    // 5. Asynchronously execute/simulate AI Damage Analysis
    this.processDamageAnalysis(evidence.id, file.originalname);

    // 6. Record Audit Event
    await this.prisma.auditEvent.create({
      data: {
        claimId,
        actorId: userId,
        action: 'EVIDENCE_UPLOADED',
        summary: `Evidence photo uploaded: ${file.originalname}`,
        details: {
          evidenceId: evidence.id,
          fileName: file.originalname,
          sizeBytes: file.size,
          sha256,
          isDuplicate: !!duplicateEvidence,
        },
      },
    });

    return {
      id: evidence.id,
      claimId: evidence.claimId,
      analysisStatus: 'PENDING',
      sha256: evidence.sha256,
      uploadedAt: evidence.createdAt,
    };
  }

  /**
   * Internal worker to process AI analysis
   */
  private async processDamageAnalysis(evidenceId: string, filename: string) {
    try {
      // Simulate fast inference or background processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      const detections = [
        {
          class: 'front_bumper_dent',
          confidence: 0.94,
          severity: 'MODERATE',
          box: [120, 140, 480, 360],
          areaPercentage: 18.5,
        },
        {
          class: 'headlight_crack',
          confidence: 0.88,
          severity: 'MINOR',
          box: [450, 160, 560, 240],
          areaPercentage: 5.2,
        },
      ];

      await this.prisma.$transaction([
        this.prisma.damageAnalysis.update({
          where: { evidenceId },
          data: {
            status: 'COMPLETED',
            modelName: 'EthioClaim-VisionAI',
            modelVersion: 'v2.4.0',
            detections,
            inferenceMs: 245,
          },
        }),
        this.prisma.evidence.update({
          where: { id: evidenceId },
          data: {
            analysisStatus: 'COMPLETED',
          },
        }),
      ]);

      this.logger.log(`Completed damage analysis for evidence ${evidenceId}`);
    } catch (err) {
      this.logger.error(`Damage analysis error for ${evidenceId}: ${err.message}`);
      await this.prisma.damageAnalysis.update({
        where: { evidenceId },
        data: {
          status: 'FAILED',
          errorCode: 'ANALYSIS_ERROR',
          errorMessage: err.message,
        },
      });
      await this.prisma.evidence.update({
        where: { id: evidenceId },
        data: { analysisStatus: 'FAILED' },
      });
    }
  }

  /**
   * List evidence for a specific claim
   */
  async findAllByClaim(claimId: string, userId: string, role: string) {
    await this.verifyClaimAccess(claimId, userId, role);

    const items = await this.prisma.evidence.findMany({
      where: {
        claimId,
        deletedAt: null,
      },
      include: {
        analysis: true,
        matchedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = items.map((ev) => ({
      id: ev.id,
      claimId: ev.claimId,
      originalName: ev.originalName,
      mimeType: ev.mimeType,
      sizeBytes: Number(ev.sizeBytes),
      publicUrl: ev.publicUrl,
      sha256: ev.sha256,
      phash: ev.phash,
      caption: ev.caption,
      evidenceType: ev.evidenceType,
      analysisStatus: ev.analysisStatus,
      hasMatches: ev.matchedBy.length > 0,
      uploadedAt: ev.createdAt,
    }));

    return {
      items: formatted,
      page: 1,
      pageSize: formatted.length,
      total: formatted.length,
    };
  }

  /**
   * Find evidence by ID
   */
  async findById(evidenceId: string, userId: string, role: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        claim: true,
        analysis: true,
        matchedBy: {
          include: {
            matchedEvidence: {
              include: { claim: true },
            },
          },
        },
      },
    });

    if (!evidence || evidence.deletedAt) {
      throw new NotFoundException(`Evidence with ID ${evidenceId} not found`);
    }

    if (role === 'INTAKE_USER' && evidence.claim.createdById !== userId) {
      throw new ForbiddenException('Access restricted to this evidence record');
    }

    return {
      id: evidence.id,
      claimId: evidence.claimId,
      claimNumber: evidence.claim.claimNumber,
      originalName: evidence.originalName,
      mimeType: evidence.mimeType,
      sizeBytes: Number(evidence.sizeBytes),
      publicUrl: evidence.publicUrl,
      sha256: evidence.sha256,
      phash: evidence.phash,
      caption: evidence.caption,
      evidenceType: evidence.evidenceType,
      analysisStatus: evidence.analysisStatus,
      analysis: evidence.analysis
        ? {
            status: evidence.analysis.status,
            modelName: evidence.analysis.modelName,
            modelVersion: evidence.analysis.modelVersion,
            detections: evidence.analysis.detections,
            inferenceMs: evidence.analysis.inferenceMs,
            errorCode: evidence.analysis.errorCode,
          }
        : null,
      matchesCount: evidence.matchedBy.length,
      uploadedAt: evidence.createdAt,
    };
  }

  /**
   * Stream file bytes
   */
  async getFileStream(evidenceId: string, userId: string, role: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { claim: true },
    });

    if (!evidence || evidence.deletedAt) {
      throw new NotFoundException(`Evidence file not found`);
    }

    if (role === 'INTAKE_USER' && evidence.claim.createdById !== userId) {
      throw new ForbiddenException('Permission denied for this evidence file');
    }

    const { stream, contentType } = await this.storageService.getFileStream(evidence.storageKey);
    return {
      stream,
      contentType: contentType || evidence.mimeType || 'image/jpeg',
      originalName: evidence.originalName,
    };
  }

  /**
   * Soft-delete evidence
   */
  async deleteEvidence(evidenceId: string, userId: string, role: string, reason?: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        claim: {
          include: { assessment: true },
        },
      },
    });

    if (!evidence || evidence.deletedAt) {
      throw new NotFoundException(`Evidence with ID ${evidenceId} not found`);
    }

    if (role === 'INTAKE_USER' && evidence.claim.createdById !== userId) {
      throw new ForbiddenException('Cannot delete evidence uploaded by another user');
    }

    if (evidence.claim.assessment && role !== 'ADMIN') {
      throw new ConflictException('Evidence cannot be deleted after examiner assessment');
    }

    await this.prisma.evidence.update({
      where: { id: evidenceId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditEvent.create({
      data: {
        claimId: evidence.claimId,
        actorId: userId,
        action: 'EVIDENCE_DELETED',
        summary: `Evidence deleted: ${evidence.originalName}`,
        details: { evidenceId, reason: reason || 'User requested deletion' },
      },
    });

    return { success: true };
  }

  /**
   * Get damage analysis details
   */
  async getAnalysis(evidenceId: string, userId: string, role: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { claim: true, analysis: true },
    });

    if (!evidence || evidence.deletedAt) {
      throw new NotFoundException(`Evidence with ID ${evidenceId} not found`);
    }

    if (role === 'INTAKE_USER' && evidence.claim.createdById !== userId) {
      throw new ForbiddenException('Access to analysis is restricted');
    }

    if (!evidence.analysis) {
      return {
        evidenceId,
        status: 'PENDING',
        modelName: null,
        modelVersion: null,
        detections: [],
        inferenceMs: null,
        errorCode: null,
      };
    }

    return {
      evidenceId,
      status: evidence.analysis.status,
      modelName: evidence.analysis.modelName,
      modelVersion: evidence.analysis.modelVersion,
      detections: evidence.analysis.detections || [],
      inferenceMs: evidence.analysis.inferenceMs,
      errorCode: evidence.analysis.errorCode,
      errorMessage: evidence.analysis.errorMessage,
    };
  }

  /**
   * Re-analyze evidence
   */
  async reanalyze(evidenceId: string, dto: ReanalyzeDto, userId: string, role: string) {
    if (role === 'INTAKE_USER') {
      throw new ForbiddenException('Only EXAMINER and ADMIN can trigger re-analysis');
    }

    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { claim: true, analysis: true },
    });

    if (!evidence || evidence.deletedAt) {
      throw new NotFoundException(`Evidence with ID ${evidenceId} not found`);
    }

    await this.prisma.evidence.update({
      where: { id: evidenceId },
      data: { analysisStatus: 'PENDING' },
    });

    if (evidence.analysis) {
      await this.prisma.damageAnalysis.update({
        where: { evidenceId },
        data: {
          status: 'PENDING',
          retriedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });
    }

    this.processDamageAnalysis(evidenceId, evidence.originalName);

    await this.prisma.auditEvent.create({
      data: {
        claimId: evidence.claimId,
        actorId: userId,
        action: 'EVIDENCE_REANALYZED',
        summary: `Re-analysis requested for ${evidence.originalName}`,
        details: { reason: dto.reason },
      },
    });

    return {
      evidenceId,
      status: 'PENDING',
    };
  }

  /**
   * Get duplicate / similarity matches
   */
  async getMatches(evidenceId: string, userId: string, role: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        claim: true,
        matchedBy: {
          include: {
            matchedEvidence: {
              include: { claim: true },
            },
          },
        },
      },
    });

    if (!evidence || evidence.deletedAt) {
      throw new NotFoundException(`Evidence with ID ${evidenceId} not found`);
    }

    if (role === 'INTAKE_USER' && evidence.claim.createdById !== userId) {
      throw new ForbiddenException('Access to matches is restricted');
    }

    const matches = evidence.matchedBy.map((m) => ({
      matchedEvidenceId: m.matchedEvidenceId,
      claimId: m.matchedEvidence.claimId,
      claimNumber: m.matchedEvidence.claim.claimNumber,
      matchType: m.matchType,
      score: m.score ? Number(m.score) : 1.0,
      distance: m.distance ?? 0,
      uploadedAt: m.matchedEvidence.createdAt,
    }));

    return {
      evidenceId,
      matches,
    };
  }

  /**
   * Get analysis by analysis record ID
   */
  async getAnalysisById(analysisId: string, userId: string, role: string) {
    const analysis = await this.prisma.damageAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        evidence: {
          include: { claim: true },
        },
      },
    });

    if (!analysis) {
      throw new NotFoundException(`Analysis record with ID ${analysisId} not found`);
    }

    if (role === 'INTAKE_USER' && analysis.evidence.claim.createdById !== userId) {
      throw new ForbiddenException('Access to analysis is restricted');
    }

    return {
      id: analysis.id,
      evidenceId: analysis.evidenceId,
      status: analysis.status,
      modelName: analysis.modelName,
      modelVersion: analysis.modelVersion,
      detections: analysis.detections || [],
      inferenceMs: analysis.inferenceMs,
      errorCode: analysis.errorCode,
    };
  }
}
