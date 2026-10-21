import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EvidenceService } from './evidence.service';
import { UploadEvidenceDto, ReanalyzeDto } from './dto/evidence.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post('claims/:claimId/evidence')
  @Roles('INTAKE_USER', 'ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('claimId') claimId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadEvidenceDto,
    @Req() req: any,
  ) {
    return this.evidenceService.uploadEvidence(
      claimId,
      file,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Get('claims/:claimId/evidence')
  findAllByClaim(@Param('claimId') claimId: string, @Req() req: any) {
    return this.evidenceService.findAllByClaim(
      claimId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('evidence/:evidenceId')
  findOne(@Param('evidenceId') evidenceId: string, @Req() req: any) {
    return this.evidenceService.findById(evidenceId, req.user.id, req.user.role);
  }

  @Get('evidence/:evidenceId/file')
  async getFile(
    @Param('evidenceId') evidenceId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { stream, contentType, originalName } =
      await this.evidenceService.getFileStream(
        evidenceId,
        req.user.id,
        req.user.role,
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(originalName)}"`,
    );
    stream.pipe(res);
  }

  @Delete('evidence/:evidenceId')
  @Roles('INTAKE_USER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('evidenceId') evidenceId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.evidenceService.deleteEvidence(
      evidenceId,
      req.user.id,
      req.user.role,
      reason,
    );
  }

  @Get('evidence/:evidenceId/analysis')
  getAnalysis(@Param('evidenceId') evidenceId: string, @Req() req: any) {
    return this.evidenceService.getAnalysis(
      evidenceId,
      req.user.id,
      req.user.role,
    );
  }

  @Post('evidence/:evidenceId/reanalyze')
  @Roles('EXAMINER', 'ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  reanalyze(
    @Param('evidenceId') evidenceId: string,
    @Body() dto: ReanalyzeDto,
    @Req() req: any,
  ) {
    return this.evidenceService.reanalyze(
      evidenceId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Get('evidence/:evidenceId/matches')
  @Roles('EXAMINER', 'ADMIN')
  getMatches(@Param('evidenceId') evidenceId: string, @Req() req: any) {
    return this.evidenceService.getMatches(
      evidenceId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('analysis/:analysisId')
  getAnalysisById(@Param('analysisId') analysisId: string, @Req() req: any) {
    return this.evidenceService.getAnalysisById(
      analysisId,
      req.user.id,
      req.user.role,
    );
  }
}
