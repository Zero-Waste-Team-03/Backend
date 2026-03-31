import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ERROR_CODES, type ErrorCodeKey } from './error-codes';
import type { ErrorArgsMap } from './error-args';

type CodeOf<K extends ErrorCodeKey> = (typeof ERROR_CODES)[K]['code'];

/**
 * Type-safe application error thrower.
 *
 * - Requires args when the error code has an entry in {@link ErrorArgsMap}.
 * - Forbids args when the error code has no entry.
 * - Always throws — return type is `never`.
 *
 * @example
 * throwAppError('AUTH_INVALID_CREDENTIALS');
 * throwAppError('UPLOAD_MAX_FILES_EXCEEDED', { max: 5 });
 */
export function throwAppError<K extends ErrorCodeKey>(
  key: K,
  ...rest: CodeOf<K> extends keyof ErrorArgsMap
    ? [args: ErrorArgsMap[CodeOf<K>]]
    : []
): never {
  const entry = ERROR_CODES[key];
  const args = rest[0] as Record<string, unknown> | undefined;
  const payload = {
    message: entry.message,
    errCode: entry.code,
    ...(args ? { args } : {}),
  };

  const ExceptionClass = statusToException(entry.httpStatus);
  throw new ExceptionClass(payload);
}

function statusToException(
  status: number,
): new (response: object) => HttpException {
  switch (status) {
    case 400:
      return BadRequestException;
    case 401:
      return UnauthorizedException;
    case 403:
      return ForbiddenException;
    case 404:
      return NotFoundException;
    case 409:
      return ConflictException;
    case 500:
      return InternalServerErrorException;
    default:
      return InternalServerErrorException;
  }
}
