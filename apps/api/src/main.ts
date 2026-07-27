import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { loadApiEnv } from './config/env';

async function bootstrap() {
  const env = loadApiEnv();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  app.enableCors({
    origin: env.frontendUrl,
    credentials: true,
  });

  // Order matters: Nest checks the most-recently-registered filter first, so
  // the specific Prisma filter runs before the catch-all GlobalExceptionFilter.
  app.useGlobalFilters(
    new GlobalExceptionFilter(),
    new PrismaExceptionFilter(),
  );
  app.setGlobalPrefix('api');

  await app.listen(env.port);
}
void bootstrap();
 exaplai