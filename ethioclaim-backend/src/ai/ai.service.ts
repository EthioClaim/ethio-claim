import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiAnalysisRequestDto,
  AiAnalysisResponseDto,
  SimilaritySearchDto,
  OcrExtractDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly internalToken: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>('ML_SERVICE_URL') ||
      process.env.ML_SERVICE_URL ||
      'http://127.0.0.1:8000'
    ).replace(/\/$/, '');

    this.internalToken =
      this.configService.get<string>('INTERNAL_SERVICE_TOKEN') ||
      process.env.INTERNAL_SERVICE_TOKEN ||
      'ethio_claim_internal_secret_key_2026';

    this.timeoutMs = 25000;
  }

  /**
   * Internal helper for executing HTTP requests to FastAPI service
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    retries = 1,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Service-Token': this.internalToken,
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `ML Service returned HTTP ${response.status}: ${errText.slice(0, 200)}`,
          );
        }

        return (await response.json()) as T;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Request to ${endpoint} failed (attempt ${attempt + 1}/${retries + 1}): ${err.message}`,
        );
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error(`Failed to call ML Service at ${endpoint}`);
  }

  /**
   * Health check for ML Service
   */
  async getHealth(): Promise<any> {
    try {
      return await this.request('/health/ready', 'GET');
    } catch (err) {
      return {
        status: 'DOWN',
        service: 'EthioClaim-FastAPI-ML',
        error: err.message,
      };
    }
  }

  /**
   * Delegate damage analysis, vector upsert, and fraud screening to FastAPI ML backend
   */
  async analyzeEvidence(dto: AiAnalysisRequestDto): Promise<AiAnalysisResponseDto> {
    try {
      this.logger.log(
        `Delegating analysis for evidence ${dto.evidenceId} (claim ${dto.claimId}) to ML Service`,
      );
      const res = await this.request<AiAnalysisResponseDto>(
        '/internal/v1/analyze',
        'POST',
        dto,
        1,
      );
      return res;
    } catch (err: any) {
      this.logger.error(
        `ML Service analysis failed for evidence ${dto.evidenceId}: ${err.message}. Generating graceful fallback.`,
      );
      // Graceful fallback matching contract so workflow continues safely
      return {
        analysisId: dto.analysisId,
        evidenceId: dto.evidenceId,
        claimId: dto.claimId,
        status: 'FAILED',
        damageDetections: [],
        embedding: {
          stored: false,
          model: 'fallback',
          version: 'none',
        },
        visualMatches: [],
        riskAssessment: {
          label: 'INCONCLUSIVE',
          score: null,
          reasons: [
            `AI service unreachable (${err.message}). Flagged for manual examiner verification.`,
          ],
          requiresExaminerReview: true,
          ruleVersion: 'fallback-v1',
        },
        warnings: ['ML backend service unavailable, manual inspection required.'],
        createdAt: new Date().toISOString(),
        errorCode: 'ML_SERVICE_UNAVAILABLE',
        errorMessage: err.message,
      };
    }
  }

  /**
   * Search for similar historical evidence vectors
   */
  async searchSimilarity(dto: SimilaritySearchDto): Promise<any> {
    return this.request('/internal/v1/similarity/search', 'POST', dto);
  }

  /**
   * Extract document text or license plate via OCR
   */
  async extractOcr(dto: OcrExtractDto): Promise<any> {
    return this.request('/internal/v1/ocr/extract', 'POST', dto);
  }
}
