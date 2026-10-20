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
} from './dto/claims.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateClaimDto, @Req() req: any) {
    return this.claimsService.create(dto, req.user.id);
  }

  @Get()
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
  findOne(@Param('claimId') claimId: string, @Req() req: any) {
    return this.claimsService.findById(claimId, req.user.id, req.user.role);
  }

  @Patch(':claimId')
  update(
    @Param('claimId') claimId: string,
    @Body() dto: UpdateClaimDto,
    @Req() req: any,
  ) {
    return this.claimsService.update(claimId, dto, req.user.id, req.user.role);
  }

  @Patch(':claimId/status')
  updateStatus(
    @Param('claimId') claimId: string,
    @Body() dto: UpdateClaimStatusDto,
    @Req() req: any,
  ) {
    return this.claimsService.updateStatus(claimId, dto, req.user.id, req.user.role);
  }

  @Get(':claimId/timeline')
  getTimeline(@Param('claimId') claimId: string, @Req() req: any) {
    return this.claimsService.getTimeline(claimId, req.user.id, req.user.role);
  }

  @Post(':claimId/request-evidence')
  @HttpCode(HttpStatus.CREATED)
  requestEvidence(
    @Param('claimId') claimId: string,
    @Body() dto: RequestEvidenceDto,
    @Req() req: any,
  ) {
    return this.claimsService.requestEvidence(claimId, dto, req.user.id);
  }
}
