import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';

export enum RoleEnum {
  INTAKE_USER = 'INTAKE_USER',
  EXAMINER = 'EXAMINER',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(RoleEnum)
  role: RoleEnum;

  @IsString()
  @MinLength(6)
  password: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(RoleEnum)
  @IsOptional()
  role?: RoleEnum;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreatePolicyDto {
  @IsString()
  policyNumber: string;

  @IsString()
  @IsOptional()
  holderName?: string;

  @IsString()
  @IsOptional()
  vehicleRegistration?: string;

  @IsString()
  @IsOptional()
  vehicleMake?: string;

  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @IsString()
  @IsOptional()
  insurer?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  coverageAmount?: string;
}

export class UpdatePolicyDto {
  @IsString()
  @IsOptional()
  holderName?: string;

  @IsString()
  @IsOptional()
  vehicleRegistration?: string;

  @IsString()
  @IsOptional()
  vehicleMake?: string;

  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @IsString()
  @IsOptional()
  insurer?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  coverageAmount?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;
}
