import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import {
  CreateUserDto,
  UpdateUserDto,
  ResetPasswordDto,
} from "./dto/admin.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../auth/roles.guard";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Roles("ADMIN")
  findAllUsers(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("role") role?: string,
    @Query("active") active?: string,
  ) {
    return this.adminService.findAllUsers({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      role,
      active: active !== undefined ? active === "true" : undefined,
    });
  }

  @Post()
  @Roles("ADMIN")
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.adminService.createUser(dto, req.user.id);
  }

  @Get(":userId")
  @Roles("ADMIN")
  findUserById(@Param("userId") userId: string) {
    return this.adminService.findUserById(userId);
  }

  @Patch(":userId")
  @Roles("ADMIN")
  updateUser(
    @Param("userId") userId: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUser(userId, dto, req.user.id);
  }

  @Post(":userId/reset-password")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param("userId") userId: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: any,
  ) {
    return this.adminService.resetPassword(
      userId,
      dto.newPassword,
      req.user.id,
    );
  }
}
