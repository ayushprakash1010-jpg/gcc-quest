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

  // Global Rate Limiting (100 req / min)
  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 1000, // Limit each IP to 1000 requests per `window`
      message: 'Too many requests, please try again later.',
    }),
  );

  // Auth Login specific rate limit (5 attempts / 15 min) is handled in auth.controller

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

// force restart

// restart for final test
