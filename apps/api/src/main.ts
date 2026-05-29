import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { loadApiEnv } from './config/env';

async function bootstrap() {
  const env = loadApiEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: env.frontendUrl,
    credentials: true
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');

  await app.listen(env.port);
}
bootstrap();
