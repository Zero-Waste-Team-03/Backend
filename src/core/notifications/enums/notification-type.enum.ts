import { registerEnumType } from '@nestjs/graphql';

export const NOTIFICATION_TYPE = {
  MESSAGE: 'Message',
  CHAT_MESSAGE: 'Chat_message',
  NEW_POST: 'New_post',
  TEST: 'Test',
  NEW_ACHIEVEMENT: 'New_achievement',
  RESERVATION_ALERT: 'Reservation_alert',
  RESERVATION_EXPIRED: 'Reservation_expired',
  RESERVATION_CANCELLED: 'Reservation_cancelled',
  REPORT_ALERT: 'Report_alert',
  ACCOUNT_STATUS_ALERT: 'Account_status_alert',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPE);

registerEnumType(NOTIFICATION_TYPE, {
  name: 'NotificationType',
});
