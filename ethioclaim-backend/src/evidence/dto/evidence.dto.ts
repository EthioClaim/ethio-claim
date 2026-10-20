import { IsString, IsOptional } from 'class-validator';

export class UploadEvidenceDto {
  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  evidenceType?: string;
}

export class ReanalyzeDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
