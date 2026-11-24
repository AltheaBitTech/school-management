import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getRequestId } from '../middleware/correlation-id.middleware';
import { AppConfig, CONFIGURATION_KEY } from '../../config/configuration';
import { ConfigService } from '@nestjs/config';

interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = getRequestId(request);
    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    const isProduction = appConfig?.isProduction ?? false;

    const { statusCode, code, message, details } = this.resolveException(exception);
    const exposeMessage = !isProduction || statusCode < 500 || code !== 'INTERNAL_SERVER_ERROR';

    if (statusCode >= 500) {
      this.logger.error(
        {
          requestId,
          method: request.method,
          path: request.url,
          statusCode,
          code,
          message: exception instanceof Error ? exception.message : message,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        'Unhandled application error',
      );
    } else {
      this.logger.warn(
        {
          requestId,
          method: request.method,
          path: request.url,
          statusCode,
          code,
          message,
        },
        'Client error',
      );
    }

    const body: ApiErrorBody = {
      statusCode,
      code,
      message: exposeMessage ? message : 'Internal server error',
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    };

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    if (isFileTooLarge(exception)) {
      return {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        code: 'FILE_TOO_LARGE',
        message: 'This file is larger than the 50 MB limit.',
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          statusCode,
          code: HttpStatus[statusCode] ?? 'HTTP_EXCEPTION',
          message: exceptionResponse,
        };
      }

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, unknown>;
        const message =
          typeof payload.message === 'string'
            ? payload.message
            : Array.isArray(payload.message)
              ? payload.message.join('; ')
              : exception.message;

        return {
          statusCode,
          code:
            typeof payload.code === 'string'
              ? payload.code
              : (HttpStatus[statusCode] ?? 'HTTP_EXCEPTION'),
          message,
          details:
            typeof payload.details === 'object' && payload.details !== null
              ? (payload.details as Record<string, unknown>)
              : undefined,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: exception instanceof Error ? exception.message : 'Internal server error',
    };
  }
}

function isFileTooLarge(exception: unknown): boolean {
  if (
    typeof exception === 'object' &&
    exception !== null &&
    'code' in exception &&
    (exception as { code?: unknown }).code === 'LIMIT_FILE_SIZE'
  ) {
    return true;
  }

  return exception instanceof HttpException && exception.getStatus() === HttpStatus.PAYLOAD_TOO_LARGE;
}
