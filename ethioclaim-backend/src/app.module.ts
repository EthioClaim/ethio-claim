import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PoliciesModule } from './policies/policies.module';
import { ClaimsModule } from './claims/claims.module';
import { HealthModule } from './health/health.module';
import { EvidenceModule } from './evidence/evidence.module';
import { AssessmentModule } from './assessment/assessment.module';
import { AdminModule } from './admin/admin.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PoliciesModule,
    ClaimsModule,
    EvidenceModule,
    AssessmentModule,
    AdminModule,
    DashboardModule,
    AiModule,
  ],
})
export class AppModule { }
