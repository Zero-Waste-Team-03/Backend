import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  Inject,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlContextType } from '@nestjs/graphql';
import { GraphQLError, GraphQLResolveInfo } from 'graphql';
import { Response } from 'express';
import { ALERTING_SERVICE } from 'src/monitoring/alerting/alerting.module';
import { AlertingService } from 'src/monitoring/alerting/interfaces/alerting.interface';
import { isError } from 'lodash';

/**
 * Global exception filter that handles {@link HttpException} for both
 * HTTP (REST) and GraphQL contexts.
 *
 * - **HTTP**: returns a JSON error response via Express `Response`.
 * - **GraphQL**: throws a {@link GraphQLError} with structured `extensions`
 *   so Apollo's `formatError` can pass them through to the client.
 *
 * @example
 * // Registered globally in main.ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @Inject(ALERTING_SERVICE)
    private readonly alertingService: AlertingService,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const status = exception.getStatus();
    const responsePayload = this.extractErrorDetails(exception.getResponse());
    const message =
      responsePayload.message || exception.message || 'Internal server error';

    this.logger.warn(`HTTP Exception: Status ${status} - Message: ${message}`);
    if (exception.cause) {
      this.logger.error(exception.cause);
    }

    // Send alert for internal server errors
    if (status >= 500) {
      this.alertingService
        .sendAlert(`Internal Server Error: ${message}`)
        .catch((err) =>
          this.logger.error(
            `Failed to send alert: ${isError(err) ? err.message : err}`,
          ),
        );
    }

    /** Handle GraphQL context */
    if (host.getType<GqlContextType>() === 'graphql') {
      const gqlHost = GqlArgumentsHost.create(host);
      const info = gqlHost.getInfo<GraphQLResolveInfo>();

      this.logger.warn(
        `GraphQL Exception on field "${info?.fieldName}": Status ${status} - Message: ${message}`,
      );

      throw new GraphQLError(message, {
        extensions: {
          code: this.mapStatusToCode(status),
          statusCode: status,
          success: false,
          timestamp: new Date().toISOString(),
          ...(responsePayload.errCode
            ? { err_code: responsePayload.errCode }
            : {}),
          ...(responsePayload.args ? { args: responsePayload.args } : {}),
        },
      });
    }

    /** Handle HTTP (REST) context */
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(status).json({
      statusCode: status,
      message: message,
      success: false,
      timestamp: new Date().toISOString(),
      ...(responsePayload.errCode ? { err_code: responsePayload.errCode } : {}),
      ...(responsePayload.args ? { args: responsePayload.args } : {}),
    });
  }

  private extractErrorDetails(exceptionResponse: unknown): {
    message?: string;
    errCode?: string;
    args?: Record<string, unknown>;
  } {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    if (!this.isRecord(exceptionResponse)) {
      return {};
    }

    const rawMessage = exceptionResponse.message;
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.filter((item) => typeof item === 'string').join(', ')
          : undefined;

    const errCodeCandidates = [
      exceptionResponse.err_code,
      exceptionResponse.errCode,
      exceptionResponse.error_code,
      exceptionResponse.errorCode,
    ];
    const errCode = errCodeCandidates.find(
      (candidate) => typeof candidate === 'string',
    );

    const args = this.isRecord(exceptionResponse.args)
      ? exceptionResponse.args
      : undefined;

    return { message, errCode, args };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Maps an HTTP status code to a human-readable GraphQL error code
   * following Apollo convention (UPPER_SNAKE_CASE).
   *
   * @param status - HTTP status code
   * @returns A GraphQL-style error code string
   */
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
