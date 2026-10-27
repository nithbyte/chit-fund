import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS
  const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const allowedOrigins = corsOriginEnv.split(',').map((o) => o.trim());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      try {
        const url = new URL(origin);
        if (
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          url.hostname.endsWith('.vercel.app') ||
          url.hostname === 'manammcare.com' ||
          url.hostname.endsWith('.manammcare.com') ||
          url.hostname === 'localhost'
        ) {
          return callback(null, true);
        }
      } catch (_) {}
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global API Prefix
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Durga Chit Fund Management API')
    .setDescription(
      'REST API for Chit Fund Management System operated by Durga. Handles manual collections, auction bids, dividends, customer accounts, and ledger schedules.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    customSiteTitle: 'Durga Chit Fund API Docs',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Durga Chit Fund Backend running on http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
