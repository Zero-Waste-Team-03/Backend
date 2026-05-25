import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { AlertingService } from 'src/monitoring/alerting/interfaces/alerting.interface';
import { isPostgresError, PostgresErrorCode } from '../constants/db-code';

interface PostgresDriverError {
  code?: string;
  detail?: string;
  column?: string;
  constraint?: string;
}

interface DatabaseErrorResult {
  status: number;
  message: string;
  error: string;
}

type RequestLike = {
  method?: string;
  url?: string;
  originalUrl?: string;
};

type ReplyLike = {
  status?: (statusCode: number) => ReplyLike;
  send?: (body: unknown) => void;
  json?: (body: unknown) => void;
  headersSent?: boolean;
};

@Catch(QueryFailedError, EntityNotFoundError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  constructor(
    @Inject('AlertingService')
    private readonly alertingService: AlertingService,
  ) {}

  catch(
    exception: QueryFailedError | EntityNotFoundError,
    host: ArgumentsHost,
  ): void {
    const isGraphql = host.getType<string>() === 'graphql';
    const gqlHost = isGraphql ? GqlArgumentsHost.create(host) : null;

    const response: ReplyLike | undefined = isGraphql
      ? gqlHost?.getContext<{ res?: ReplyLike }>()?.res
      : host.switchToHttp().getResponse<ReplyLike>();

    const request: RequestLike | undefined = isGraphql
      ? gqlHost?.getContext<{ req?: RequestLike }>()?.req
      : host.switchToHttp().getRequest<RequestLike>();

    const errorResult = this.handleException(exception);

    this.logError(exception, request, errorResult.status);

    if (errorResult.status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.alertingService.sendAlert(
        `Database Error: ${errorResult.error} - ${errorResult.message}`,
      );
    }

    const errorResponse = {
      statusCode: errorResult.status,
      timestamp: new Date().toISOString(),
      error: errorResult.error,
      message: errorResult.message,
    };

    if (isGraphql) {
      throw new GraphQLError(errorResult.message, {
        extensions: {
          code: this.mapStatusToCode(errorResult.status),
          statusCode: errorResult.status,
          success: false,
          error: errorResult.error,
          timestamp: errorResponse.timestamp,
        },
      });
    }

    if (!response) {
      return;
    }

    if (response.headersSent) {
      return;
    }

    const replyWithStatus = response.status
      ? response.status(errorResult.status)
      : response;

    if (replyWithStatus.send) {
      replyWithStatus.send(errorResponse);
      return;
    }

    if (replyWithStatus.json) {
      replyWithStatus.json(errorResponse);
    }
  }

  private handleException(
    exception: QueryFailedError | EntityNotFoundError,
  ): DatabaseErrorResult {
    if (this.isEntityNotFoundError(exception)) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'db.resourceNotFound.message',
        error: 'db.resourceNotFound.error',
      };
    }

    if (this.isQuertFailedError(exception)) {
      return this.handleQueryFailedError(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'db.databaseError.message',
      error: 'db.databaseError.error',
    };
  }

  private isEntityNotFoundError(
    exception: unknown,
  ): exception is EntityNotFoundError {
    return exception instanceof EntityNotFoundError;
  }

  private isQuertFailedError(
    exception: unknown,
  ): exception is QueryFailedError {
    return exception instanceof QueryFailedError;
  }

  private handleQueryFailedError(error: QueryFailedError): DatabaseErrorResult {
    const driverError = this.extractDriverError(error);

    if (driverError?.code && isPostgresError(driverError as unknown)) {
      switch (driverError.code) {
        case PostgresErrorCode.UNIQUE_VIOLATION:
          return {
            status: HttpStatus.CONFLICT,
            message: this.extractUniqueViolationMessage(driverError),
            error: 'db.uniqueViolation.error',
          };

        case PostgresErrorCode.FOREIGN_KEY_VIOLATION:
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'db.foreignKeyViolation.message',
            error: 'db.foreignKeyViolation.error',
          };

        case PostgresErrorCode.NOT_NULL_VIOLATION:
          return {
            status: HttpStatus.BAD_REQUEST,
            message: this.extractNotNullViolationMessage(driverError),
            error: 'db.notNullViolation.error',
          };

        case PostgresErrorCode.CHECK_VIOLATION:
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'db.checkViolation.message',
            error: 'db.checkViolation.error',
          };

        case PostgresErrorCode.EXCLUSION_VIOLATION:
          return {
            status: HttpStatus.CONFLICT,
            message: 'db.exclusionViolation.message',
            error: 'db.exclusionViolation.error',
          };

        case PostgresErrorCode.INVALID_TEXT_REPRESENTATION:
          return {
            status: HttpStatus.BAD_REQUEST,
            message: this.extractInvalidTextRepresentationMessage(driverError),
            error: 'db.invalidInput.error',
          };

        default:
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'db.databaseError.message',
            error: 'db.databaseError.error',
          };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'db.databaseError.message',
      error: 'db.databaseError.error',
    };
  }

  private extractDriverError(error: QueryFailedError): PostgresDriverError {
    /*eslint-disable-next-line*/
    return (error as any).driverError ?? (error as any);
  }

  private shouldIncludeStack(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private logError(
    exception: QueryFailedError | EntityNotFoundError,
    request: RequestLike | undefined,
    statusCode: number,
  ): void {
    const method = request?.method ?? 'UNKNOWN';
    const url = request?.url ?? request?.originalUrl ?? 'UNKNOWN';

    console.log(
      `Database Error: ${method} ${url} - ${exception.message} ${exception.stack}`,
    );
    if (statusCode >= 500) {
      this.logger.error('Database Error', {
        method,
        url,
        statusCode,
        error: exception.message,
        stack: exception instanceof Error ? exception.stack : undefined,
        context: 'DatabaseExceptionFilter',
      });
    } else {
      this.logger.warn('Database Warning', {
        method,
        url,
        statusCode,
        error: exception.message,
        context: 'DatabaseExceptionFilter',
      });
    }
  }

  private extractUniqueViolationMessage(
    driverError: PostgresDriverError,
  ): string {
    const detail = driverError?.detail;

    if (detail && typeof detail === 'string') {
      const match = detail.match(/Key \(([^)]+)\)=/);
      if (match && match[1]) {
        return 'db.uniqueViolation.message';
      }
    }

    return 'db.uniqueViolation.defaultMessage';
  }

  private extractNotNullViolationMessage(
    driverError: PostgresDriverError,
  ): string {
    const column = driverError?.column;

    if (column) {
      return 'db.notNullViolation.message';
    }
    return 'db.notNullViolation.defaultMessage';
  }

  private extractInvalidTextRepresentationMessage(
    driverError: PostgresDriverError,
  ): string {
    const detail = driverError?.detail;

    if (typeof detail === 'string' && detail.length > 0) {
      return `db.invalidInput.message: ${detail}`;
    }

    return 'db.invalidInput.defaultMessage';
  }

  private mapStatusToCode(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
    };
    return statusMap[status] || 'INTERNAL_SERVER_ERROR';
  }
}
