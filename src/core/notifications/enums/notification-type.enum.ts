import { registerEnumType } from '@nestjs/graphql';

export const NOTIFICATION_TYPE = {
  MESSAGE: 'Message',
  NEW_POST: 'New_post',
  TEST: 'Test',
  NEW_ACHIEVEMENT: 'New_achievement',
  RESERVATION_ALERT: 'Reservation_alert',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPE);

registerEnumType(NOTIFICATION_TYPE, {
  name: 'NotificationType',
});
