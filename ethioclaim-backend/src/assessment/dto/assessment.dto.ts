import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum SeverityEnum {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  UNDETERMINED = 'UNDETERMINED',
}

export class CreateAssessmentDto {
  @IsEnum(SeverityEnum)
  severity: SeverityEnum;

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
