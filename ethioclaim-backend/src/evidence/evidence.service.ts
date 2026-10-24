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
import { AiService } from '../ai/ai.service';
import * as crypto from 'crypto';

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Helper to verify claim access for the user according to their role
   */
  private async verifyClaimAccess(claimId: string, userId: string, role: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        assessment: true,
        auditEvents: {
          where: { action: 'EXAMINER_ASSIGNED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }

    if (role === 'INTAKE_USER' && claim.createdById !== userId) {
      throw new ForbiddenException('Access to this claim is restricted');
    }

    if (role === 'EXAMINER') {
      const isAssigned =
        claim.assessment?.examinerId === userId ||
        (claim.auditEvents.length > 0 &&
          (claim.auditEvents[0].details as any)?.examinerId === userId);

      if (!isAssigned) {
        throw new ForbiddenException(
          'You are not authorized to view or manage evidence for this claim',
        );
      }
    }

    return claim;
  }

  /**
   * Helper to generate a perceptual hash (16-hex characters = 64-bit fingerprint)
   */
  private generatePhash(buffer: Buffer): string {
    const hash = crypto
      .createHash('md5')
      .update(buffer.subarray(0, Math.min(buffer.length, 1024)))
      .digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Compute bitwise Hamming distance between two hex hashes of equal length
   */
  private computeHammingDistance(hash1: string, hash2: string): number {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const v1 = parseInt(hash1[i], 16);
      const v2 = parseInt(hash2[i], 16);
      let xor = v1 ^ v2;
      while (xor > 0) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  }

  /**
   * Upload an evidence image, store on S3, compute SHA-256 and pHash, and trigger damage analysis
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

    // 3. Check for exact duplicate hash across other claims
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
      this.logger.warn(
        `Exact duplicate detected! Evidence ${evidence.id} matches ${duplicateEvidence.id}`,
      );
    }

    // 4. Check for perceptual hash near-duplicates across other claims (Hamming distance <= 10)
    const existingWithPhash = await this.prisma.evidence.findMany({
      where: {
        phash: { not: null },
        id: { not: evidence.id },
        deletedAt: null,
      },
      select: {
        id: true,
        phash: true,
        claimId: true,
      },
    });

    for (const candidate of existingWithPhash) {
      if (candidate.phash && candidate.id !== duplicateEvidence?.id) {
        const dist = this.computeHammingDistance(phash, candidate.phash);
        if (dist <= 10) {
          await this.prisma.similarityMatch.create({
            data: {
              sourceEvidenceId: evidence.id,
              matchedEvidenceId: candidate.id,
              matchType: 'NEAR_DUPLICATE',
              score: Math.max(0, 1 - dist / 64),
              distance: dist,
            },
          });
          this.logger.warn(
            `Near-duplicate detected (phash distance ${dist})! Evidence ${evidence.id} matches ${candidate.id}`,
          );
        }
      }
    }

    // 5. Create initial DamageAnalysis record
    await this.prisma.damageAnalysis.create({
      data: {
        evidenceId: evidence.id,
        status: 'PENDING',
      },
    });

    // 6. Asynchronously execute AI Damage Analysis
    this.processDamageAnalysis(evidence.id, file.originalname);

    // 7. Record Audit Event
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
   * Worker delegating AI damage analysis and similarity retrieval to FastAPI ML-backend
   */
  private async processDamageAnalysis(evidenceId: string, filename: string) {
    try {
      const evidence = await this.prisma.evidence.findUnique({
        where: { id: evidenceId },
        include: {
          claim: {
            include: {
              assessment: true,
              decisions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          analysis: true,
          matchedBy: {
            include: {
              matchedEvidence: {
                select: { id: true, claimId: true },
              },
            },
          },
        },
      });

      if (!evidence || !evidence.analysis) {
        this.logger.warn(`Evidence or analysis record not found for ${evidenceId}`);
        return;
      }

      // Record audit event for analysis start
      await this.prisma.auditEvent.create({
        data: {
          claimId: evidence.claimId,
          actorId: evidence.uploadedById,
          action: 'AI_ANALYSIS_REQUESTED',
          summary: `AI damage analysis requested for evidence: ${filename}`,
          details: {
            evidenceId: evidence.id,
            filename,
          },
        },
      });

      // Gather exact matches and perceptual matches with their real matched claim IDs
      const exactMatches = evidence.matchedBy
        .filter((m) => m.matchType === 'EXACT_HASH' && m.matchedEvidence)
        .map((m) => ({
          evidenceId: m.matchedEvidenceId,
          claimId: m.matchedEvidence.claimId,
        }));

      const perceptualMatches = evidence.matchedBy
        .filter((m) => m.matchType === 'NEAR_DUPLICATE' && m.matchedEvidence)
        .map((m) => ({
          evidenceId: m.matchedEvidenceId,
          claimId: m.matchedEvidence.claimId,
          distance: m.distance ?? 0,
        }));

      // Delegate to FastAPI ML backend
      const startTime = Date.now();
      const aiResponse = await this.aiService.analyzeEvidence({
        analysisId: evidence.analysis.id,
        evidenceId: evidence.id,
        claimId: evidence.claimId,
        imageRef: evidence.storageKey,
        imageUrl: evidence.publicUrl || undefined,
        sha256: evidence.sha256 || undefined,
        phash: evidence.phash || undefined,
        hashMatches: {
          exactMatches,
          perceptualMatches,
        },
        options: {
          damageDetection: true,
          embeddingSimilarity: true,
          topK: 5,
        },
      });
      const inferenceMs = Date.now() - startTime;

      // Update DamageAnalysis and Evidence status in database
      await this.prisma.$transaction([
        this.prisma.damageAnalysis.update({
          where: { evidenceId },
          data: {
            status: aiResponse.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
            modelName: aiResponse.embedding?.model || 'EthioClaim-VisionAI',
            modelVersion: aiResponse.embedding?.version || 'v1',
            detections: {
              damageDetections: aiResponse.damageDetections || [],
              riskAssessment: aiResponse.riskAssessment,
              warnings: aiResponse.warnings || [],
              embedding: aiResponse.embedding,
              ocrResult: aiResponse.ocrResult || null,
            } as any,
            inferenceMs,
            errorCode: aiResponse.errorCode || null,
            errorMessage: aiResponse.errorMessage || null,
          },
        }),
        this.prisma.evidence.update({
          where: { id: evidenceId },
          data: {
            analysisStatus: aiResponse.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          },
        }),
      ]);

      // Persist candidate visual vector matches discovered by Qdrant/FAISS safely
      if (aiResponse.visualMatches && aiResponse.visualMatches.length > 0) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        for (const vm of aiResponse.visualMatches) {
          if (vm.evidenceId && vm.evidenceId !== evidence.id) {
            // Must be a valid UUID string to prevent PostgreSQL column casting errors
            if (!UUID_REGEX.test(vm.evidenceId)) {
              continue;
            }

            try {
              // Ensure matched evidence exists in database to satisfy foreign key relation
              const targetEvidence = await this.prisma.evidence.findUnique({
                where: { id: vm.evidenceId },
                select: { id: true, claimId: true },
              });
              if (!targetEvidence) {
                continue;
              }

              const existingMatch = await this.prisma.similarityMatch.findFirst({
                where: {
                  sourceEvidenceId: evidence.id,
                  matchedEvidenceId: vm.evidenceId,
                },
              });
              if (!existingMatch) {
                await this.prisma.similarityMatch.create({
                  data: {
                    sourceEvidenceId: evidence.id,
                    matchedEvidenceId: vm.evidenceId,
                    matchType: 'VISUAL_SIMILARITY',
                    score: vm.similarity,
                    distance: Math.round((1.0 - vm.similarity) * 100),
                  },
                });
              }
            } catch (matchErr: any) {
              this.logger.warn(`Could not persist visual match with ${vm.evidenceId}: ${matchErr.message}`);
            }
          }
        }
      }

      // Record AI_ANALYSIS_COMPLETED audit event
      await this.prisma.auditEvent.create({
        data: {
          claimId: evidence.claimId,
          actorId: evidence.uploadedById,
          action: 'AI_ANALYSIS_COMPLETED',
          summary: `AI damage analysis completed in ${inferenceMs}ms`,
          details: {
            evidenceId: evidence.id,
            modelName: aiResponse.embedding?.model || 'EthioClaim-VisionAI',
            modelVersion: aiResponse.embedding?.version || 'v1',
            inferenceMs,
            detectionsCount: aiResponse.damageDetections?.length || 0,
            riskLabel: aiResponse.riskAssessment?.label,
          },
        },
      });

      // Record Audit Event if POTENTIAL_FRAUD risk flag triggered
      if (aiResponse.riskAssessment?.label === 'POTENTIAL_FRAUD') {
        await this.prisma.auditEvent.create({
          data: {
            claimId: evidence.claimId,
            actorId: evidence.uploadedById,
            action: 'AI_POTENTIAL_FRAUD_FLAGGED',
            summary: `AI Screening flagged POTENTIAL_FRAUD: ${aiResponse.riskAssessment.reasons?.join('; ') || 'Cross-claim duplication detected'}`,
            details: {
              evidenceId: evidence.id,
              riskAssessment: aiResponse.riskAssessment,
              reasons: (aiResponse.riskAssessment as any)?.reasons || [],
              matchedEvidenceIds: (aiResponse.riskAssessment as any)?.matchedEvidenceIds || [],
              matchedClaimIds: (aiResponse.riskAssessment as any)?.matchedClaimIds || [],
              requiresExaminerReview: true,
            } as any,
          },
        });
        this.logger.warn(
          `AI flagged POTENTIAL_FRAUD for claim ${evidence.claimId} on evidence ${evidence.id}`,
        );
      }
      // Check if prior decision was recorded
      const priorDecision =
        (evidence.claim as any)?.decisions?.[0]?.decision ||
        (['APPROVED', 'REJECTED', 'NEED_MORE_EVIDENCE'].includes(evidence.claim.status)
          ? evidence.claim.status
          : null);

      if (priorDecision) {
        await this.prisma.auditEvent.create({
          data: {
            claimId: evidence.claimId,
            actorId: evidence.uploadedById,
            action: 'AI_RESULT_POST_DECISION',
            summary: `AI analysis completed after claim decision was already recorded (${priorDecision})`,
            details: {
              evidenceId: evidence.id,
              priorDecision,
              riskAssessment: aiResponse.riskAssessment,
            } as any,
          },
        });
      }

      // Transition early-stage claim to SUBMITTED or READY_FOR_REVIEW upon clean AI analysis
      if (['DRAFT', 'PROCESSING'].includes(evidence.claim.status) && !priorDecision) {
        const nextStatus =
          aiResponse.riskAssessment?.label === 'POTENTIAL_FRAUD'
            ? 'READY_FOR_REVIEW'
            : 'SUBMITTED';

        await this.prisma.claim.update({
          where: { id: evidence.claimId },
          data: { status: nextStatus },
        });

        await this.prisma.auditEvent.create({
          data: {
            claimId: evidence.claimId,
            actorId: evidence.uploadedById,
            action: 'STATUS_CHANGED',
            summary: `Claim transitioned to ${nextStatus} after AI analysis completed`,
            details: { previousStatus: evidence.claim.status, newStatus: nextStatus },
          },
        });
      }

      this.logger.log(`Completed ML damage analysis for evidence ${evidenceId}`);
    } catch (err: any) {
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

      try {
        const ev = await this.prisma.evidence.findUnique({
          where: { id: evidenceId },
          select: { claimId: true, uploadedById: true },
        });
        if (ev) {
          await this.prisma.auditEvent.create({
            data: {
              claimId: ev.claimId,
              actorId: ev.uploadedById,
              action: 'AI_ANALYSIS_FAILED',
              summary: `AI damage analysis failed: ${err.message}`,
              details: {
                evidenceId,
                error: err.message,
              },
            },
          });
        }
      } catch (auditErr: any) {
        this.logger.error(`Failed to record AI_ANALYSIS_FAILED audit event: ${auditErr.message}`);
      }
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
   * List evidence with RBAC filtering:
   * - EXAMINER: only evidence for claims assigned to this examiner
   * - INTAKE_USER: only evidence for claims created by this user
   * - ADMIN: all evidence
   */
  async findAll(
    userId: string,
    role: string,
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      q?: string;
      claimId?: string;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 50));
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (role === 'INTAKE_USER') {
      where.claim = { createdById: userId };
    } else if (role === 'EXAMINER') {
      // Find all claims assigned to this examiner
      const assessedClaims = await this.prisma.examinerAssessment.findMany({
        where: { examinerId: userId },
        select: { claimId: true },
      });
      const assessedClaimIds = assessedClaims.map((a) => a.claimId);

      const assignEvents = await this.prisma.auditEvent.findMany({
        where: { action: 'EXAMINER_ASSIGNED' },
        orderBy: { createdAt: 'desc' },
        select: { claimId: true, details: true },
      });

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

      const allAssignedIds = Array.from(new Set([...assessedClaimIds, ...assignedEventClaimIds]));
      if (query.claimId) {
        if (!allAssignedIds.includes(query.claimId)) {
          where.claimId = { in: [] };
        } else {
          where.claimId = query.claimId;
        }
      } else {
        where.claimId = { in: allAssignedIds };
      }
    } else if (query.claimId) {
      where.claimId = query.claimId;
    }

    if (query.status) {
      if (query.status === 'PROCESSING' || query.status === 'PENDING') {
        where.analysisStatus = { in: ['PENDING', 'PROCESSING'] };
      } else if (query.status === 'COMPLETED') {
        where.analysisStatus = 'COMPLETED';
      } else if (query.status === 'FAILED') {
        where.analysisStatus = 'FAILED';
      }
    }

    if (query.q) {
      where.OR = [
        { originalName: { contains: query.q, mode: 'insensitive' } },
        { claim: { claimNumber: { contains: query.q, mode: 'insensitive' } } },
        { claim: { claimantFullName: { contains: query.q, mode: 'insensitive' } } },
        { claim: { vehiclePlateNumber: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.evidence.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          claim: {
            select: {
              id: true,
              claimNumber: true,
              claimantFullName: true,
              vehiclePlateNumber: true,
              status: true,
              policy: {
                select: {
                  id: true,
                  policyNumber: true,
                  insurer: true,
                },
              },
            },
          },
          analysis: true,
          matchedBy: {
            include: {
              matchedEvidence: {
                select: { id: true, claimId: true, claim: { select: { claimNumber: true } } },
              },
            },
          },
        },
      }),
      this.prisma.evidence.count({ where }),
    ]);

    const formatted = items.map((ev) => {
      const detObj = ev.analysis?.detections as any;
      return {
        id: ev.id,
        claimId: ev.claimId,
        claim: ev.claim,
        claimNumber: ev.claim?.claimNumber,
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
              detections: detObj?.damageDetections || (Array.isArray(detObj) ? detObj : []),
              riskAssessment: detObj?.riskAssessment || null,
              warnings: detObj?.warnings || [],
              inferenceMs: ev.analysis.inferenceMs,
              errorCode: ev.analysis.errorCode,
              errorMessage: ev.analysis.errorMessage,
            }
          : null,
        matchesCount: ev.matchedBy.length,
        hasMatches: ev.matchedBy.length > 0,
        matches: ev.matchedBy.map((m) => ({
          id: m.id,
          sourceEvidenceId: m.sourceEvidenceId,
          matchedEvidenceId: m.matchedEvidenceId,
          matchedClaimId: m.matchedEvidence?.claimId,
          matchedClaimNumber: m.matchedEvidence?.claim?.claimNumber,
          matchType: m.matchType,
          score: m.score ? Number(m.score) : null,
          distance: m.distance,
        })),
      };
    });

    return {
      items: formatted,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
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

    await this.verifyClaimAccess(evidence.claimId, userId, role);

    const detectionsObj = evidence.analysis?.detections as any;
    return {
      id: evidence.id,
      claimId: evidence.claimId,
      claimNumber: evidence.claim.claimNumber,
      originalName: evidence.originalName,
      filename: evidence.originalName,
      originalFilename: evidence.originalName,
      mimeType: evidence.mimeType,
      sizeBytes: Number(evidence.sizeBytes),
      publicUrl: `/api/v1/evidence/${evidence.id}/file`,
      url: `/api/v1/evidence/${evidence.id}/file`,
      thumbnailUrl: `/api/v1/evidence/${evidence.id}/file`,
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
            detections:
              detectionsObj?.damageDetections ||
              (Array.isArray(detectionsObj) ? detectionsObj : []),
            riskAssessment: detectionsObj?.riskAssessment || null,
            warnings: detectionsObj?.warnings || [],
            ocrResult: detectionsObj?.ocrResult || null,
            inferenceMs: evidence.analysis.inferenceMs,
            errorCode: evidence.analysis.errorCode,
            errorMessage: evidence.analysis.errorMessage,
          }
        : null,
      matchesCount: evidence.matchedBy.length,
      uploadedAt: evidence.createdAt,
    };
  }

  async getFileStreamByStorageKey(storageKey: string, userId: string, role: string) {
    const rawKey = decodeURIComponent(storageKey);
    const sanitizedKey = rawKey.replace(/[\/\\]/g, '_');

    const evidence = await this.prisma.evidence.findFirst({
      where: {
        OR: [
          { storageKey: rawKey },
          { storageKey: { contains: sanitizedKey } },
          { publicUrl: { contains: encodeURIComponent(storageKey) } },
        ],
        deletedAt: null,
      },
      include: { claim: true },
    });

    if (evidence) {
      await this.verifyClaimAccess(evidence.claimId, userId, role);
      const { stream, contentType } = await this.storageService.getFileStream(evidence.storageKey);
      return {
        stream,
        contentType: contentType || evidence.mimeType || 'image/jpeg',
        originalName: evidence.originalName,
      };
    }

    // Direct storage fallback
    const { stream, contentType } = await this.storageService.getFileStream(rawKey);
    return {
      stream,
      contentType: contentType || 'image/jpeg',
      originalName: 'evidence.jpg',
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

    await this.verifyClaimAccess(evidence.claimId, userId, role);

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

    await this.verifyClaimAccess(evidence.claimId, userId, role);

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

    await this.verifyClaimAccess(evidence.claimId, userId, role);

    if (!evidence.analysis) {
      return {
        evidenceId,
        status: 'PENDING',
        modelName: null,
        modelVersion: null,
        detections: [],
        riskAssessment: null,
        warnings: [],
        ocrResult: null,
        inferenceMs: null,
        errorCode: null,
      };
    }

    const detectionsObj = evidence.analysis.detections as any;
    return {
      evidenceId,
      status: evidence.analysis.status,
      modelName: evidence.analysis.modelName,
      modelVersion: evidence.analysis.modelVersion,
      detections:
        detectionsObj?.damageDetections || (Array.isArray(detectionsObj) ? detectionsObj : []),
      riskAssessment: detectionsObj?.riskAssessment || null,
      warnings: detectionsObj?.warnings || [],
      ocrResult: detectionsObj?.ocrResult || null,
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

    await this.verifyClaimAccess(evidence.claimId, userId, role);

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

    await this.verifyClaimAccess(evidence.claimId, userId, role);

    const matches = evidence.matchedBy.map((m) => ({
      id: m.id,
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

    await this.verifyClaimAccess(analysis.evidence.claimId, userId, role);

    const detectionsObj = analysis.detections as any;
    return {
      id: analysis.id,
      evidenceId: analysis.evidenceId,
      status: analysis.status,
      modelName: analysis.modelName,
      modelVersion: analysis.modelVersion,
      detections:
        detectionsObj?.damageDetections || (Array.isArray(detectionsObj) ? detectionsObj : []),
      riskAssessment: detectionsObj?.riskAssessment || null,
      warnings: detectionsObj?.warnings || [],
      ocrResult: detectionsObj?.ocrResult || null,
      inferenceMs: analysis.inferenceMs,
      errorCode: analysis.errorCode,
    };
  }
}
