import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersController } from './users.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, UsersController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
