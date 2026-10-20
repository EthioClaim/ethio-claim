import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
