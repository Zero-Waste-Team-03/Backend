import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { throwAppError } from 'src/common/errors/throw-app-error';

describe('throwAppError', () => {
  it('should throw UnauthorizedException for 401 codes', () => {
    expect(() => throwAppError('AUTH_INVALID_CREDENTIALS')).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw NotFoundException for 404 codes', () => {
    expect(() => throwAppError('USER_NOT_FOUND')).toThrow(NotFoundException);
  });

  it('should throw BadRequestException for 400 codes', () => {
    expect(() => throwAppError('USER_ALREADY_EXISTS')).toThrow(
      BadRequestException,
    );
  });

  it('should include errCode in the exception response', () => {
    expect.assertions(2);
    try {
      throwAppError('AUTH_INVALID_CREDENTIALS');
    } catch (e) {
      const response = (e as UnauthorizedException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.errCode).toBe('auth.invalid_credentials');
      expect(response.message).toBe('Invalid email or password.');
    }
  });

  it('should include args when provided', () => {
    expect.assertions(2);
    try {
      throwAppError('UPLOAD_MAX_FILES_EXCEEDED', { max: 5 });
    } catch (e) {
      const response = (e as BadRequestException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.errCode).toBe('upload.max_files_exceeded');
      expect(response.args).toEqual({ max: 5 });
    }
  });

  it('should not include args when not provided', () => {
    expect.assertions(1);
    try {
      throwAppError('AUTH_INVALID_CREDENTIALS');
    } catch (e) {
      const response = (e as UnauthorizedException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.args).toBeUndefined();
    }
  });
});
