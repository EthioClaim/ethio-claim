import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = res.message || exception.message;
        code = res.code || res.error || this.getStatusCodeName(status);
        if (Array.isArray(res.message)) {
          details = res.message;
          message = details.join('; ');
          code = 'VALIDATION_ERROR';
        } else if (res.details) {
          details = res.details;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      details,
    });
  }

  private getStatusCodeName(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 413:
        return 'FILE_TOO_LARGE';
      case 415:
        return 'UNSUPPORTED_MEDIA_TYPE';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMITED';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'ERROR';
    }
  }
}
