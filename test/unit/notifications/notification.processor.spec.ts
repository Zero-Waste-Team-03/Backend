import { NotificationProcessor } from 'src/infrastructure/queue/notification/notification.processor';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { FirebaseService } from 'src/infrastructure/firebase/firebase.service';
import { UserService } from 'src/core/user/v1/user.service';
import { NOTIFICATION_JOBS } from 'src/common/constants/jobs';
import { NOTIFICATION_TYPE } from 'src/core/notifications/enums/notification-type.enum';

describe('NotificationProcessor', () => {
  const notificationsService = {
    getActiveTokensForUser: jest.fn(),
    revokeToken: jest.fn(),
    saveNotificationRecord: jest.fn(),
  } as unknown as NotificationsService;

  const firebaseService = {
    getFcm: jest.fn(() => ({
      send: jest.fn(),
    })),
  } as unknown as FirebaseService;

  const userService = {
    getUserSettings: jest.fn(),
  } as unknown as UserService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips FCM send when push notifications are disabled', async () => {
    (userService.getUserSettings as jest.Mock).mockResolvedValue({
      isPushNotificationsEnabled: false,
    });

    const processor = new NotificationProcessor(
      notificationsService,
      firebaseService,
      userService,
    );

    await processor.process({
      id: 'job-1',
      name: NOTIFICATION_JOBS.SEND_NOTIFICATION,
      data: {
        title: 'Hello',
        body: 'World',
        userId: 'user-1',
        type: NOTIFICATION_TYPE.MESSAGE,
      },
    } as any);

    expect(notificationsService.getActiveTokensForUser).not.toHaveBeenCalled();
    expect(firebaseService.getFcm).not.toHaveBeenCalled();
  });

  it('sends FCM when push notifications are enabled', async () => {
    const send = jest.fn().mockResolvedValue('ok');
    (firebaseService.getFcm as jest.Mock).mockReturnValue({
      send,
    });
    (userService.getUserSettings as jest.Mock).mockResolvedValue({
      isPushNotificationsEnabled: true,
    });
    (
      notificationsService.getActiveTokensForUser as jest.Mock
    ).mockResolvedValue([{ token: 'token-1' }]);

    const processor = new NotificationProcessor(
      notificationsService,
      firebaseService,
      userService,
    );

    await processor.process({
      id: 'job-2',
      name: NOTIFICATION_JOBS.SEND_NOTIFICATION,
      data: {
        title: 'Hello',
        body: 'World',
        userId: 'user-2',
        type: NOTIFICATION_TYPE.MESSAGE,
        translationArgs: {
          imageUrl: 'https://cdn.example.com/image.png',
          donationId: 'donation-1',
          quantity: 3,
          missing: undefined,
          empty: null,
        },
        idempotencyKey: 'donation:donation-1',
      },
    } as any);

    expect(notificationsService.getActiveTokensForUser).toHaveBeenCalledWith(
      'user-2',
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      token: 'token-1',
      notification: {
        title: 'Hello',
        body: 'World',
        image: 'https://cdn.example.com/image.png',
      },
      data: {
        type: 'MESSAGE',
        idempotencyKey: 'donation:donation-1',
        imageUrl: 'https://cdn.example.com/image.png',
        donationId: 'donation-1',
        quantity: '3',
        meta: JSON.stringify({
          imageUrl: 'https://cdn.example.com/image.png',
          donationId: 'donation-1',
          quantity: 3,
        }),
      },
      android: {
        collapseKey: 'com.zerowaste.zerowaste',
        notification: {
          imageUrl: 'https://cdn.example.com/image.png',
        },
      },
      apns: {
        fcmOptions: {
          imageUrl: 'https://cdn.example.com/image.png',
        },
      },
    });
  });

  describe('helpers', () => {
    const proc = new NotificationProcessor(
      notificationsService,
      firebaseService,
      userService,
    ) as any;

    it('buildDataPayload stringifies primitives, JSON-encodes objects, skips nullish', () => {
      const payload = proc.buildDataPayload(
        NOTIFICATION_TYPE.CHAT_MESSAGE,
        'chat:msg-1',
        {
          type: 'client-supplied-type',
          conversationId: 'conv-1',
          quantity: 3,
          isRead: false,
          missing: undefined,
          empty: null,
          nested: { a: 1 },
        },
      );

      expect(payload).toEqual({
        type: 'CHAT_MESSAGE',
        idempotencyKey: 'chat:msg-1',
        conversationId: 'conv-1',
        quantity: '3',
        isRead: 'false',
        nested: JSON.stringify({ a: 1 }),
        meta: JSON.stringify({
          type: 'client-supplied-type',
          conversationId: 'conv-1',
          quantity: 3,
          isRead: false,
          nested: { a: 1 },
        }),
      });
    });

    it('buildDataPayload maps stored notification values to mobile type keys', () => {
      expect(
        proc.buildDataPayload(NOTIFICATION_TYPE.NEW_POST, undefined, {}).type,
      ).toBe('NEW_POST');
      expect(
        proc.buildDataPayload(NOTIFICATION_TYPE.TEST, undefined, {}).type,
      ).toBe('TEST');
      expect(
        proc.buildDataPayload(NOTIFICATION_TYPE.NEW_ACHIEVEMENT, undefined, {})
          .type,
      ).toBe('NEW_ACHIEVEMENT');
      expect(
        proc.buildDataPayload(
          NOTIFICATION_TYPE.RESERVATION_ALERT,
          undefined,
          {},
        ).type,
      ).toBe('RESERVATION_ALERT');
      expect(
        proc.buildDataPayload(NOTIFICATION_TYPE.REPORT_ALERT, undefined, {})
          .type,
      ).toBe('REPORT_ALERT');
      expect(
        proc.buildDataPayload(
          NOTIFICATION_TYPE.ACCOUNT_STATUS_ALERT,
          undefined,
          {},
        ).type,
      ).toBe('ACCOUNT_STATUS_ALERT');
    });

    it('buildDataPayload omits idempotencyKey when not provided', () => {
      const payload = proc.buildDataPayload(
        NOTIFICATION_TYPE.CHAT_MESSAGE,
        undefined,
        { conversationId: 'conv-1' },
      );

      expect(payload.idempotencyKey).toBeUndefined();
      expect(payload.conversationId).toBe('conv-1');
      expect(payload.meta).toBe(JSON.stringify({ conversationId: 'conv-1' }));
    });

    it('resolveImageUrl prefers imageUrl > donationImageUrl > senderAvatarUrl', () => {
      expect(
        proc.resolveImageUrl({
          imageUrl: 'a',
          donationImageUrl: 'b',
          senderAvatarUrl: 'c',
        }),
      ).toBe('a');
      expect(
        proc.resolveImageUrl({
          donationImageUrl: 'b',
          senderAvatarUrl: 'c',
        }),
      ).toBe('b');
      expect(proc.resolveImageUrl({ senderAvatarUrl: 'c' })).toBe('c');
      expect(proc.resolveImageUrl({})).toBeUndefined();
    });

    it('buildNotificationBody truncates to 120 chars with ellipsis', () => {
      expect(proc.buildNotificationBody('short')).toBe('short');
      const longBody = 'a'.repeat(200);
      const result = proc.buildNotificationBody(longBody);
      expect(result).toHaveLength(120);
      expect(result.endsWith('...')).toBe(true);
    });
  });
});
