import { Module } from '@nestjs/common';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { StorageService } from './storage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [EvidenceController],
  providers: [EvidenceService, StorageService],
  exports: [EvidenceService, StorageService],
})
export class EvidenceModule {}
