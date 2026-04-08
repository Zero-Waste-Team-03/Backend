export const SEARACH_JOB_NAME = {
  SEARCH: 'search',
  SEARCH_INDEX: 'search_index',
  SEARCH_DELETE: 'search_delete',
  SEARCH_UPDATE: 'search_update',
  SEARCH_REINDEX: 'search_reindex',
  SEARCH_REBUILD: 'search_rebuild',
  SEARCH_SYNC: 'search_sync',
  SEARCH_SYNC_ALL: 'search_sync_all',
  SEARCH_SYNC_INDEX: 'search_sync_index',
  SEARCH_SYNC_DELETE: 'search_sync_delete',
  SEARCH_SYNC_UPDATE: 'search_sync_update',
} as const;
export const MAIL_JOBS = {
  SEND_MAIL: 'send-mail',
  SEND_VERIFICATION_MAIL: 'send-verification-mail',
  SEND_PASSWORD_RESET_MAIL: 'send-password-reset-mail',
  SEND_PASSWORD_CHANGED_ALERT: 'send-password-changed-alert',
  SEND_ACCOUNT_CREATED_MAIL: 'send-account-created-mail',
};

export const UPLOAD_JOBS = {
  UPLOAD_FILE: 'upload-file',
  UPLOAD_FILES: 'upload-files',
  DELETE_FILE: 'delete-file',
  DELETE_FILES: 'delete-files',
  UPLOAD_OAUTH_PROFILE_PICTURE: 'upload-oauth-profile-picture',
};

export const NOTIFICATION_JOBS = {
  SEND_NOTIFICATION: 'send-notification',
  SEND_TEST_NOTIFICATION: 'send-test-notification',
  SEND_WITHOUT_SAVING: 'send-without-saving',
};

export const RESERVATION_JOBS = {
  EXPIRE_RESERVATION: 'expire-reservation',
} as const;
