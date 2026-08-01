import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Initialize Sentry
  Sentry.init({
    dsn: configService.get('SENTRY_DSN') || '',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  // Security headers (CSP, XSS, HSTS)
  app.use(helmet());

  // Compression
  app.use(compression());

  // Enable CORS
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, /\.vercel\.app$/, 'http://localhost:3000'],
    credentials: true,
  });

  // Global Rate Limiting: 1000 requests / minute per IP
  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 1000,
      message: 'Too many requests, please try again later.',
    }),
  );

  // HIGH-02: Strict login rate limit — 10 attempts per 15 minutes per IP.
  // Prevents brute-force password attacks. Uses same express-rate-limit package.
  // This middleware is scoped ONLY to the login endpoint and does not affect any other route.
  app.use(
    '/api/v1/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 login attempts per 15 minutes per IP
      message: {
        statusCode: 429,
        message:
          'Too many login attempts from this IP. Please try again after 15 minutes.',
        error: 'Too Many Requests',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Global Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/dependencies'],
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Interceptors
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(),
    new ResponseTransformInterceptor(),
    new TimeoutInterceptor(),
  );

  // Global Exception Filter (will also log to Sentry)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
