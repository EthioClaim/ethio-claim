import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();

    // Query retry middleware for transient connection drops or cold-start timeouts
    this.$use(async (params, next) => {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          return await next(params);
        } catch (error: any) {
          attempts++;
          const msg = error?.message || '';
          const isTransient =
            msg.includes('connection pool') ||
            msg.includes('closed the connection') ||
            msg.includes('Connection terminated') ||
            msg.includes('ECONNRESET') ||
            msg.includes('ETIMEDOUT');

          if (isTransient && attempts < maxAttempts) {
            this.logger.warn(
              `Transient database connection error on ${params.model}.${params.action} (attempt ${attempts}/${maxAttempts}). Retrying in 1s...`,
            );
            await new Promise((res) => setTimeout(res, 1000));
            try {
              await this.$connect();
            } catch {}
          } else {
            throw error;
          }
        }
      }
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to PostgreSQL database successfully.');
    } catch (err: any) {
      this.logger.error(`Initial database connection warning: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
