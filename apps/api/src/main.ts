import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('v1', {
    exclude: [
      'health/live',
      'health/ready',
      // ContentOS publishing bridge: the wire paths are fixed by the accepted
      // v1 contract (base URL ends at .../internal/contentos, then /v1/...).
      { path: 'internal/contentos/v1/media/:sha256', method: RequestMethod.PUT },
      { path: 'internal/contentos/v1/publications', method: RequestMethod.POST },
    ],
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // The ContentOS contract media upload is raw binary, not JSON: register a
  // raw parser scoped to image content types (bounded above the 10 MiB
  // contract limit so the explicit 413 check owns the rejection).
  app.useBodyParser('raw', {
    type: ['image/png', 'image/jpeg', 'image/webp'],
    limit: '12mb',
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = request.header('x-request-id') ?? randomUUID();
    response.setHeader('x-request-id', requestId);
    next();
  });
  app.enableCors({
    origin: [
      process.env.WEB_URL ?? 'http://localhost:3000',
      process.env.ADMIN_URL ?? 'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const openApi = new DocumentBuilder()
    .setTitle('Konsepthane API')
    .setDescription('Konsepthane platform REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi), {
    customSiteTitle: 'Konsepthane API',
  });

  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}

void bootstrap();
