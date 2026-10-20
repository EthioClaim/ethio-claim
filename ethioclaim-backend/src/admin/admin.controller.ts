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
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreatePolicyDto,
  UpdatePolicyDto,
} from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Users Endpoints ─────────────────────────────────────────────────────────
  @Get('users')
  findAllUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('role') role?: string,
    @Query('active') active?: string,
  ) {
    return this.adminService.findAllUsers({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      role,
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.adminService.createUser(dto, req.user.id);
  }

  @Patch('users/:userId')
  updateUser(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUser(userId, dto, req.user.id);
  }

  // ── Policies Endpoints ──────────────────────────────────────────────────────
  @Get('policies')
  findAllPolicies(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.findAllPolicies({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      q,
      status,
    });
  }

  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  createPolicy(@Body() dto: CreatePolicyDto, @Req() req: any) {
    return this.adminService.createPolicy(dto, req.user.id);
  }

  @Patch('policies/:policyId')
  updatePolicy(
    @Param('policyId') policyId: string,
    @Body() dto: UpdatePolicyDto,
    @Req() req: any,
  ) {
    return this.adminService.updatePolicy(policyId, dto, req.user.id);
  }
}
