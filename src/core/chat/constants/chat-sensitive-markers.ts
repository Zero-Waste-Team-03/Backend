export const CHAT_SENSITIVE_MARKERS = [
  '[SENSITIVE:LOCATION]',
  '[SENSITIVE:TIME]',
  '[SENSITIVE:PHONE]',
  '[SENSITIVE:CONTACT]',
] as const;

export const SENSITIVE_PENDING_PLACEHOLDER =
  '[Sensitive details pending recipient approval]';
