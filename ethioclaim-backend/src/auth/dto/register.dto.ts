import { IsEmail, IsString, MinLength, IsEnum } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(["ADMIN", "EXAMINER", "INTAKE_USER"], {
    message: "Invalid user role",
  })
  role: "ADMIN" | "EXAMINER" | "INTAKE_USER";
}
