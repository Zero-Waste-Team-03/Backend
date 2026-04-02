/**
 * Centralized error code registry.
 *
 * Every application error that can be surfaced to clients lives here.
 * The `/api/v1/errors` endpoint serves this catalog so any client
 * (React, Flutter, etc.) can pull it and generate typed error handling.
 *
 * Convention: keys are UPPER_SNAKE_CASE, codes are `domain.error_name`.
 * When an entry has an `args` field, it describes the runtime shape
 * of the interpolation arguments (used by the contract endpoint).
 */
export const ERROR_CODES = {
  // ── Auth ────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS: {
    code: 'auth.invalid_credentials',
    httpStatus: 401,
    message: 'Invalid email or password.',
  },
  AUTH_EMAIL_NOT_VERIFIED: {
    code: 'auth.email_not_verified',
    httpStatus: 401,
    message: 'Email address has not been verified.',
  },
  AUTH_ACCOUNT_SUSPENDED: {
    code: 'auth.account_suspended',
    httpStatus: 401,
    message: 'This account has been suspended.',
  },
  AUTH_INVALID_CURRENT_PASSWORD: {
    code: 'auth.invalid_current_password',
    httpStatus: 401,
    message: 'Current password is incorrect.',
  },
  AUTH_INVALID_VERIFICATION_CODE: {
    code: 'auth.invalid_verification_code',
    httpStatus: 400,
    message: 'Verification code is invalid or expired.',
  },
  AUTH_INVALID_RESET_TOKEN: {
    code: 'auth.invalid_reset_token',
    httpStatus: 400,
    message: 'Password reset token is invalid or expired.',
  },
  AUTH_OAUTH_NO_EMAIL: {
    code: 'auth.oauth_no_email',
    httpStatus: 401,
    message: 'OAuth account does not have a verified email address.',
  },
  AUTH_OAUTH_PASSWORD_RESET: {
    code: 'auth.oauth_password_reset',
    httpStatus: 400,
    message: 'Cannot reset password for OAuth users.',
  },
  AUTH_REFRESH_TOKEN_INVALID: {
    code: 'auth.refresh_token_invalid',
    httpStatus: 401,
    message: 'Refresh token is invalid or expired.',
  },

  // ── User ────────────────────────────────────────────────────────────
  USER_NOT_FOUND: {
    code: 'user.not_found',
    httpStatus: 404,
    message: 'User not found.',
  },
  USER_ALREADY_EXISTS: {
    code: 'user.already_exists',
    httpStatus: 400,
    message: 'A user with this email already exists.',
  },
  USER_INVALID_PASSWORD: {
    code: 'user.invalid_password',
    httpStatus: 400,
    message: 'Password is incorrect.',
  },

  // ── Notification ────────────────────────────────────────────────────
  NOTIFICATION_NOT_FOUND: {
    code: 'notification.not_found',
    httpStatus: 404,
    message: 'Notification not found.',
  },
  NOTIFICATION_NO_ACTIVE_TOKENS: {
    code: 'notification.no_active_tokens',
    httpStatus: 400,
    message: 'No active notification tokens found for this user.',
  },

  // ── Donation ────────────────────────────────────────────────────────
  DONATION_NOT_FOUND: {
    code: 'donation.not_found',
    httpStatus: 404,
    message: 'Donation not found.',
    args: { id: 'string' } as const,
  },
  DONATION_INVALID_EXPIRY_DATE: {
    code: 'donation.invalid_expiry_date',
    httpStatus: 400,
    message: 'Donation expiry date is invalid.',
  },

  // ── Upload ──────────────────────────────────────────────────────────
  UPLOAD_FILE_REQUIRED: {
    code: 'upload.file_required',
    httpStatus: 400,
    message: 'A file is required.',
  },
  UPLOAD_FILES_REQUIRED: {
    code: 'upload.files_required',
    httpStatus: 400,
    message: 'At least one file is required.',
  },
  UPLOAD_TYPE_REQUIRED: {
    code: 'upload.type_required',
    httpStatus: 400,
    message: 'Upload type is required.',
  },
  UPLOAD_MAX_FILES_EXCEEDED: {
    code: 'upload.max_files_exceeded',
    httpStatus: 400,
    message: 'Maximum {max} files allowed.',
    args: { max: 'number' } as const,
  },
  UPLOAD_ATTACHMENT_NOT_FOUND: {
    code: 'upload.attachment_not_found',
    httpStatus: 400,
    message: 'Attachment not found.',
    args: { id: 'string' } as const,
  },
  UPLOAD_FAILED_ATTACHMENT: {
    code: 'upload.failed_attachment',
    httpStatus: 400,
    message: 'Attachment upload failed.',
    args: { id: 'string' } as const,
  },
  UPLOAD_IDS_REQUIRED: {
    code: 'upload.ids_required',
    httpStatus: 400,
    message: 'File IDs are required.',
  },
  UPLOAD_ATTACHMENTS_NOT_FOUND: {
    code: 'upload.attachments_not_found',
    httpStatus: 400,
    message: 'Some attachments were not found.',
    args: { ids: 'string[]' } as const,
  },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
export type ErrorCodeValue = (typeof ERROR_CODES)[ErrorCodeKey]['code'];
