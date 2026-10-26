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
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
