import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExactMatchDto {
  @IsString()
  evidenceId: string;

  @IsString()
  @IsOptional()
  claimId?: string;
}

export class PerceptualMatchDto {
  @IsString()
  evidenceId: string;

  @IsString()
  @IsOptional()
  claimId?: string;

  @IsNumber()
  @IsOptional()
  distance?: number;
}

export class HashMatchesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExactMatchDto)
  @IsOptional()
  exactMatches?: ExactMatchDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerceptualMatchDto)
  @IsOptional()
  perceptualMatches?: PerceptualMatchDto[];
}

export class AiAnalysisOptionsDto {
  @IsBoolean()
  @IsOptional()
  damageDetection?: boolean;

  @IsBoolean()
  @IsOptional()
  embeddingSimilarity?: boolean;

  @IsBoolean()
  @IsOptional()
  ocrExtraction?: boolean;

  @IsNumber()
  @IsOptional()
  topK?: number;
}

export class AiAnalysisRequestDto {
  @IsString()
  analysisId: string;

  @IsString()
  evidenceId: string;

  @IsString()
  claimId: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  imageRef?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imageBase64?: string;

  @IsString()
  @IsOptional()
  sha256?: string;

  @IsString()
  @IsOptional()
  phash?: string;

  @ValidateNested()
  @Type(() => HashMatchesDto)
  @IsOptional()
  hashMatches?: HashMatchesDto;

  @ValidateNested()
  @Type(() => AiAnalysisOptionsDto)
  @IsOptional()
  options?: AiAnalysisOptionsDto;
}

export class DamageDetectionDto {
  label: string;
  confidence: number;
  severity: string;
  box: number[];
  areaPercentage?: number;
}

export class EmbeddingResultDto {
  stored: boolean;
  pointId?: string;
  model: string;
  version: string;
  dimension?: number;
}

export class VisualMatchDto {
  evidenceId: string;
  claimId?: string;
  similarity: number;
}

export class RiskAssessmentDto {
  label: 'POTENTIAL_FRAUD' | 'NO_FRAUD_INDICATORS_FOUND' | 'INCONCLUSIVE' | 'ANALYSIS_FAILED';
  score?: number | null;
  reasons: string[];
  requiresExaminerReview: boolean;
  ruleVersion: string;
}

export class AiAnalysisResponseDto {
  analysisId: string;
  evidenceId: string;
  claimId?: string;
  status: 'COMPLETED' | 'FAILED' | 'INCONCLUSIVE';
  damageDetections: DamageDetectionDto[];
  embedding: EmbeddingResultDto;
  visualMatches: VisualMatchDto[];
  riskAssessment: RiskAssessmentDto;
  ocrResult?: any;
  warnings: string[];
  createdAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export class SimilaritySearchDto {
  @IsString()
  @IsOptional()
  evidenceId?: string;

  @IsString()
  @IsOptional()
  claimId?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsArray()
  @IsOptional()
  vector?: number[];

  @IsNumber()
  @IsOptional()
  topK?: number;

  @IsNumber()
  @IsOptional()
  minSimilarity?: number;
}

export class OcrExtractDto {
  @IsString()
  @IsOptional()
  imageRef?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imageBase64?: string;

  @IsString()
  @IsOptional()
  documentType?: string;
}
