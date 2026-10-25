import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SeverityEnum {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  UNDETERMINED = 'UNDETERMINED',
}

export class CreateAssessmentDto {
  @IsEnum(SeverityEnum)
  severity: SeverityEnum;

  @Transform(({ value }) => (value !== undefined && value !== null ? String(value) : value))
  @IsString()
  estimatedLossEtb: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateAssessmentDto {
  @IsEnum(SeverityEnum)
  @IsOptional()
  severity?: SeverityEnum;

  @Transform(({ value }) => (value !== undefined && value !== null ? String(value) : value))
  @IsString()
  @IsOptional()
  estimatedLossEtb?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateDecisionDto {
  @IsString()
  decision: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
