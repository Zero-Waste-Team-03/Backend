/**
 * Namespaced deep-link actions carried on a notification's `meta.action`.
 *
 * The mobile app reads `data.action` from the FCM payload (or `meta.action`
 * on a persisted notification) to route the user to the right screen. The
 * supporting fields below MUST be set by the call site so the destination
 * screen has everything it needs without re-fetching.
 *
 * | action              | required meta                                  | optional meta                                                                       | image source                                   |
 * | ------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
 * | `chat.open`         | `chatId`, `conversationId`, `messageId`, `senderId` | `senderName`, `senderAvatarUrl`                                                | `senderAvatarUrl`                              |
 * | `donation.open`     | `donationId`                                   | `donationTitle`, `donationImageUrl`, `donorId`                                      | `donationImageUrl`                             |
 * | `reservation.open`  | `reservationId`, `donationId`, `status`        | `beneficiaryName`, `donationTitle`, `donationImageUrl`, `senderAvatarUrl`, `quantity` | `donationImageUrl` preferred, else `senderAvatarUrl` |
 * | `report.open`       | `reportId`, `targetType`, `targetId`           | `status`                                                                            | —                                              |
 * | `account.open`      | `userId`, `status`                             | —                                                                                   | —                                              |
 * | `achievement.open`  | `achievementId`, `badgeCode`                   | —                                                                                   | —                                              |
 * | `post.open`         | `postId`                                       | `commentId`, `authorId`                                                             | —                                              |
 * | `message.open`      | `threadId` or `senderId`                       | —                                                                                   | —                                              |
 * | `notification.open` | —                                              | —                                                                                   | — (fallback)                                   |
 */
export const NOTIFICATION_ACTION = {
  CHAT_OPEN: 'chat.open',
  DONATION_OPEN: 'donation.open',
  RESERVATION_OPEN: 'reservation.open',
  REPORT_OPEN: 'report.open',
  ACCOUNT_OPEN: 'account.open',
  ACHIEVEMENT_OPEN: 'achievement.open',
  POST_OPEN: 'post.open',
  MESSAGE_OPEN: 'message.open',
  TEST_OPEN: 'test.open',
  DEFAULT_OPEN: 'notification.open',
} as const;

export type NotificationAction =
  (typeof NOTIFICATION_ACTION)[keyof typeof NOTIFICATION_ACTION];

export const NOTIFICATION_ACTION_VALUES = Object.values(NOTIFICATION_ACTION);

export const NOTIFICATION_ACTION_META_REQUIRED: Record<
  NotificationAction,
  string[]
> = {
  [NOTIFICATION_ACTION.CHAT_OPEN]: [
    'chatId',
    'conversationId',
    'messageId',
    'senderId',
  ],
  [NOTIFICATION_ACTION.DONATION_OPEN]: ['donationId'],
  [NOTIFICATION_ACTION.RESERVATION_OPEN]: [
    'reservationId',
    'donationId',
    'status',
  ],
  [NOTIFICATION_ACTION.REPORT_OPEN]: ['reportId', 'targetType', 'targetId'],
  [NOTIFICATION_ACTION.ACCOUNT_OPEN]: ['userId', 'status'],
  [NOTIFICATION_ACTION.ACHIEVEMENT_OPEN]: ['achievementId', 'badgeCode'],
  [NOTIFICATION_ACTION.POST_OPEN]: ['postId'],
  [NOTIFICATION_ACTION.MESSAGE_OPEN]: [],
  [NOTIFICATION_ACTION.TEST_OPEN]: [],
  [NOTIFICATION_ACTION.DEFAULT_OPEN]: [],
};

export const NOTIFICATION_ACTION_META_OPTIONAL: Record<
  NotificationAction,
  string[]
> = {
  [NOTIFICATION_ACTION.CHAT_OPEN]: ['senderName', 'senderAvatarUrl'],
  [NOTIFICATION_ACTION.DONATION_OPEN]: [
    'donationTitle',
    'donationImageUrl',
    'donorId',
  ],
  [NOTIFICATION_ACTION.RESERVATION_OPEN]: [
    'beneficiaryName',
    'donationTitle',
    'donationImageUrl',
    'senderAvatarUrl',
    'quantity',
  ],
  [NOTIFICATION_ACTION.REPORT_OPEN]: ['status'],
  [NOTIFICATION_ACTION.ACCOUNT_OPEN]: [],
  [NOTIFICATION_ACTION.ACHIEVEMENT_OPEN]: [],
  [NOTIFICATION_ACTION.POST_OPEN]: ['commentId', 'authorId'],
  [NOTIFICATION_ACTION.MESSAGE_OPEN]: [],
  [NOTIFICATION_ACTION.TEST_OPEN]: [],
  [NOTIFICATION_ACTION.DEFAULT_OPEN]: [],
};

export interface MetaValidationResult {
  valid: boolean;
  action: NotificationAction;
  missingFields: string[];
}

export function normalizeNotificationAction(
  meta: Record<string, any> | undefined,
): NotificationAction {
  const action = meta?.action;
  if (typeof action !== 'string') {
    return NOTIFICATION_ACTION.DEFAULT_OPEN;
  }

  if ((NOTIFICATION_ACTION_VALUES as string[]).includes(action)) {
    return action as NotificationAction;
  }

  return NOTIFICATION_ACTION.DEFAULT_OPEN;
}

export function validateMetaForAction(
  meta: Record<string, any> | undefined,
): MetaValidationResult {
  const action = normalizeNotificationAction(meta);
  const requiredFields = NOTIFICATION_ACTION_META_REQUIRED[action];

  if (action === NOTIFICATION_ACTION.MESSAGE_OPEN) {
    const hasThreadId = typeof meta?.threadId === 'string';
    const hasSenderId = typeof meta?.senderId === 'string';
    if (!hasThreadId && !hasSenderId) {
      return {
        valid: false,
        action,
        missingFields: ['threadId or senderId'],
      };
    }
    return { valid: true, action, missingFields: [] };
  }

  const missingFields = requiredFields.filter(
    (field) => meta?.[field] === undefined || meta?.[field] === null,
  );

  return {
    valid: missingFields.length === 0,
    action,
    missingFields,
  };
}
