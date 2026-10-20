import {
  IsString, IsOptional, IsEmail, IsInt, IsEnum, IsDateString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClaimantDto {
  @IsString()
  fullName: string;

  @IsString()
  // @IsOptional()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

export class VehicleDto {
  @IsString()
  @IsOptional()
  plateNumber?: string;

  @IsString()
  @IsOptional()
  make?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsInt()
  @IsOptional()
  year?: number;

  @IsString()
  @IsOptional()
  vin?: string;
}

export class IncidentDto {
  @IsDateString()
  @IsOptional()
  occurredAt?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  incidentType?: string;
}

export class CreateClaimDto {
  @ValidateNested()
  @Type(() => ClaimantDto)
  claimant: ClaimantDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => VehicleDto)
  vehicle?: VehicleDto;

  @IsString()
  @IsOptional()
  policyNumber?: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => IncidentDto)
  incident?: IncidentDto;
}

export class UpdateClaimStatusDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateClaimDto {
  @ValidateNested()
  @IsOptional()
  @Type(() => ClaimantDto)
  claimant?: Partial<ClaimantDto>;

  @ValidateNested()
  @IsOptional()
  @Type(() => VehicleDto)
  vehicle?: Partial<VehicleDto>;

  @ValidateNested()
  @IsOptional()
  @Type(() => IncidentDto)
  incident?: Partial<IncidentDto>;
}

export class RequestEvidenceDto {
  @IsString()
  message: string;

  @IsOptional()
  requestedItems?: string[];
}
