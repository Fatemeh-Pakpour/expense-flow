import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { loadRedisEnv } from './config/env';
import { loggerConfig } from './config/logger.config';
import { PrismaModule } from './prisma/prisma.module';
import { HubspotModule } from './webhooks/hubspot/hubspot.module';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    PrismaModule,
    BullModule.forRoot({ connection: loadRedisEnv() }),
    HubspotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
