import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadEnvConfig } from './config/env.validation';

async function bootstrap() {
  const env = loadEnvConfig();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix(env.apiBasePath.replace(/^\//, ''));

  await app.listen(env.port);
  app.get(Logger).log(`GAIN backend listening on port ${env.port} (${env.apiBasePath})`);
}

bootstrap();
