import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("register")
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const email = dto.email || dto.username;
    if (!email) {
      return {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "email or username is required",
        details: [],
      };
    }
    return this.authService.login(email, dto.password);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {
    // Stateless JWT — client discards token
    return;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }
}
