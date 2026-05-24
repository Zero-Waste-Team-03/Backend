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
  NOTIFICATION_DEVICE_ID_REQUIRED: {
    code: 'notification.device_id_required',
    httpStatus: 400,
    message: 'The x-device-id header is required to register a device token.',
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
  DONATION_MAIN_ATTACHMENT_INVALID: {
    code: 'donation.main_attachment_invalid',
    httpStatus: 400,
    message: 'Main attachment id must be included in attachment ids.',
  },
  DONATION_ATTACHMENT_IDS_DUPLICATED: {
    code: 'donation.attachment_ids_duplicated',
    httpStatus: 400,
    message: 'Attachment ids contain duplicate values.',
  },
  DONATION_LOCATION_XOR_INVALID: {
    code: 'donation.location_xor_invalid',
    httpStatus: 400,
    message: 'Provide either locationId or locationInput, not both.',
    args: { locationId: 'string' } as const,
  },
  DONATION_NOT_AVAILABLE: {
    code: 'donation.not_available',
    httpStatus: 400,
    message: 'Donation is not available for reservation.',
    args: { id: 'string', status: 'string' } as const,
  },
  DONATION_LIKE_TARGET_INVALID: {
    code: 'donation.like_target_invalid',
    httpStatus: 400,
    message: 'Cannot like your own donation.',
    args: { id: 'string' } as const,
  },
  DONATION_APPROVAL_STATUS_INVALID: {
    code: 'donation.approval_status_invalid',
    httpStatus: 400,
    message: 'Donation cannot be approved or rejected in its current status.',
    args: { id: 'string', status: 'string' } as const,
  },

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

  CATEGORY_NOT_FOUND: {
    code: 'category.not_found',
    httpStatus: 404,
    message: 'Category not found.',
    args: { id: 'string' } as const,
  },
  RESERVATION_NOT_FOUND: {
    code: 'reservation.not_found',
    httpStatus: 404,
    message: 'Reservation not found or already processed.',
    args: { id: 'string', status: 'string' } as const,
  },
  RESERVATION_OWNERSHIP_INVALID: {
    code: 'reservation.ownership_invalid',
    httpStatus: 403,
    message: 'You do not own this reservation.',
  },
  RESERVATION_STATUS_INVALID: {
    code: 'reservation.status_invalid',
    httpStatus: 400,
    message: 'Reservation cannot be processed in its current status.',
    args: { status: 'string' } as const,
  },
  RESERVATION_QUANTITY_INVALID: {
    code: 'reservation.quantity_invalid',
    httpStatus: 400,
    message: 'Reservation quantity must be a positive integer.',
    args: { quantity: 'number' } as const,
  },
  RESERVATION_ALREADY_ACTIVE: {
    code: 'reservation.already_active',
    httpStatus: 409,
    message: 'You already have an active reservation for this donation.',
    args: { donationId: 'string', beneficiaryId: 'string' } as const,
  },
  VERIFICATION_REQUEST_NOT_FOUND: {
    code: 'verification_request.not_found',
    httpStatus: 404,
    message: 'Verification request not found.',
  },
  VERIFICATION_REQUEST_NOT_PENDING: {
    code: 'verification_request.not_pending',
    httpStatus: 400,
    message: 'Only pending requests can be updated.',
  },
  VERIFICATION_REQUEST_FORBIDDEN: {
    code: 'verification_request.forbidden',
    httpStatus: 403,
    message: 'You are not allowed to update this verification request.',
  },
  VERIFICATION_TARGET_NOT_FOOD_SAVER: {
    code: 'verification_request.target_not_food_saver',
    httpStatus: 400,
    message: 'Target user is not a food saver.',
  },
  DONATION_CAPACITY_EXCEEDED: {
    code: 'donation.capacity_exceeded',
    httpStatus: 400,
    message: 'Requested reservation quantity exceeds donation capacity.',
    args: {
      id: 'string',
      requestedQuantity: 'number',
      remainingQuantity: 'number',
    } as const,
  },
  CHAT_CONVERSATION_NOT_FOUND: {
    code: 'chat.conversation_not_found',
    httpStatus: 404,
    message: 'Conversation not found.',
    args: { id: 'string' } as const,
  },
  CHAT_MESSAGE_NOT_FOUND: {
    code: 'chat.message_not_found',
    httpStatus: 404,
    message: 'Message not found in this conversation.',
    args: { id: 'string' } as const,
  },
  CHAT_MESSAGE_READ_ONLY: {
    code: 'chat.message_read_only',
    httpStatus: 400,
    message: 'Conversation is read-only in the current state.',
    args: { status: 'string' } as const,
  },
  CHAT_INVALID_APPROVAL: {
    code: 'chat.invalid_approval',
    httpStatus: 400,
    message: 'Cannot approve this message.',
    args: { id: 'string' } as const,
  },
  BADGE_NOT_FOUND: {
    code: 'badge.not_found',
    httpStatus: 404,
    message: 'Badge not found.',
    args: { id: 'string' } as const,
  },

  REPORT_NOT_FOUND: {
    code: 'report.not_found',
    httpStatus: 404,
    message: 'Report not found.',
    args: { id: 'string' } as const,
  },
  REPORT_DUPLICATE_OPEN: {
    code: 'report.duplicate_open',
    httpStatus: 409,
    message: 'You already have an open report for this target.',
    args: { targetType: 'string', targetId: 'string' } as const,
  },
  REPORT_STATUS_INVALID: {
    code: 'report.status_invalid',
    httpStatus: 400,
    message: 'Provided report status is invalid for this action.',
    args: { status: 'string' } as const,
  },
  REPORT_EXPORT_DATASET_INVALID: {
    code: 'report.export_dataset_invalid',
    httpStatus: 400,
    message: 'Invalid export dataset.',
    args: { dataset: 'string' } as const,
  },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
export type ErrorCodeValue = (typeof ERROR_CODES)[ErrorCodeKey]['code'];
