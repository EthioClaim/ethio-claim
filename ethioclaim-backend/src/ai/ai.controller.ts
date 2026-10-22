import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { SimilaritySearchDto, OcrExtractDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  @Roles('ADMIN', 'EXAMINER', 'INTAKE_USER')
  async getHealth() {
    return this.aiService.getHealth();
  }

  @Post('similarity/search')
  @Roles('ADMIN', 'EXAMINER')
  @HttpCode(HttpStatus.OK)
  async searchSimilarity(@Body() dto: SimilaritySearchDto) {
    return this.aiService.searchSimilarity(dto);
  }

  @Post('ocr/extract')
  @Roles('ADMIN', 'EXAMINER', 'INTAKE_USER')
  @HttpCode(HttpStatus.OK)
  async extractOcr(@Body() dto: OcrExtractDto) {
    return this.aiService.extractOcr(dto);
  }
}
