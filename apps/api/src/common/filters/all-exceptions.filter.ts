import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`[${request.method}] ${request.url}`, exception.stack);
      Sentry.captureException(exception);
    } else {
      this.logger.error(`[${request.method}] ${request.url}`, exception);
      Sentry.captureException(exception);
    }

    response.status(status).json({
      error:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
