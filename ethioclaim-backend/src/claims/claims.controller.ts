import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import {
  CreateClaimDto,
  UpdateClaimDto,
  UpdateClaimStatusDto,
  RequestEvidenceDto,
  AssignExaminerDto,
  CloseClaimDto,
  SubmitClaimDto,
} from './dto/claims.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @Roles('INTAKE_USER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateClaimDto, @Req() req: any) {
    return this.claimsService.create(dto, req.user.id);
  }

  @Get()
  @Roles('ADMIN', 'EXAMINER', 'INTAKE_USER')
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('assignedToMe') assignedToMe?: string,
  ) {
    return this.claimsService.findAll(req.user.id, req.user.role, {
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      status,
      q,
      from,
      to,
      assignedToMe: assignedToMe === 'true',
    });
  }

  @Get(':claimId')
  @Roles('ADMIN', 'EXAMINER', 'INTAKE_USER')
  findOne(@Param('claimId') claimId: string, @Req() req: any) {
    return this.claimsService.findById(claimId, req.user.id, req.user.role);
  }

  @Patch(':claimId')
  @Roles('INTAKE_USER', 'ADMIN')
  update(
    @Param('claimId') claimId: string,
    @Body() dto: UpdateClaimDto,
    @Req() req: any,
  ) {
    return this.claimsService.update(claimId, dto, req.user.id, req.user.role);
  }

  @Post(':claimId/submit')
  @Roles('INTAKE_USER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  submit(
    @Param('claimId') claimId: string,
    @Body() dto: SubmitClaimDto,
    @Req() req: any,
  ) {
    return this.claimsService.submit(claimId, dto, req.user.id, req.user.role);
  }

  @Patch(':claimId/assign')
  @Roles('ADMIN')
  assignExaminer(
    @Param('claimId') claimId: string,
    @Body() dto: AssignExaminerDto,
    @Req() req: any,
  ) {
    return this.claimsService.assignExaminer(claimId, dto, req.user.id);
  }

  @Post(':claimId/close')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  close(
    @Param('claimId') claimId: string,
    @Body() dto: CloseClaimDto,
    @Req() req: any,
  ) {
    return this.claimsService.close(claimId, dto, req.user.id);
  }

  @Patch(':claimId/status')
  @Roles('ADMIN', 'EXAMINER', 'INTAKE_USER')
  updateStatus(
    @Param('claimId') claimId: string,
    @Body() dto: UpdateClaimStatusDto,
    @Req() req: any,
  ) {
    return this.claimsService.updateStatus(claimId, dto, req.user.id, req.user.role);
  }

  @Get(':claimId/timeline')
  @Roles('ADMIN', 'EXAMINER', 'INTAKE_USER')
  getTimeline(@Param('claimId') claimId: string, @Req() req: any) {
    return this.claimsService.getTimeline(claimId, req.user.id, req.user.role);
  }

  @Post(':claimId/request-evidence')
  @Roles('EXAMINER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  requestEvidence(
    @Param('claimId') claimId: string,
    @Body() dto: RequestEvidenceDto,
    @Req() req: any,
  ) {
    return this.claimsService.requestEvidence(claimId, dto, req.user.id);
  }

  @Post(':claimId/request-information')
  @Roles('EXAMINER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  requestInformation(
    @Param('claimId') claimId: string,
    @Body() dto: RequestEvidenceDto,
    @Req() req: any,
  ) {
    return this.claimsService.requestEvidence(claimId, dto, req.user.id);
  }
}

