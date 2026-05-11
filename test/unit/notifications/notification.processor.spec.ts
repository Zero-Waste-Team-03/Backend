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
    (notificationsService.getActiveTokensForUser as jest.Mock).mockResolvedValue([
      { token: 'token-1' },
    ]);

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
      },
    } as any);

    expect(notificationsService.getActiveTokensForUser).toHaveBeenCalledWith(
      'user-2',
    );
    expect(send).toHaveBeenCalledTimes(1);
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
          conversationId: 'conv-1',
          quantity: 3,
          isRead: false,
          missing: undefined,
          empty: null,
          nested: { a: 1 },
        },
      );

      expect(payload).toEqual({
        type: NOTIFICATION_TYPE.CHAT_MESSAGE,
        idempotencyKey: 'chat:msg-1',
        conversationId: 'conv-1',
        quantity: '3',
        isRead: 'false',
        nested: JSON.stringify({ a: 1 }),
      });
    });

    it('buildDataPayload omits idempotencyKey when not provided', () => {
      const payload = proc.buildDataPayload(
        NOTIFICATION_TYPE.CHAT_MESSAGE,
        undefined,
        { conversationId: 'conv-1' },
      );

      expect(payload.idempotencyKey).toBeUndefined();
      expect(payload.conversationId).toBe('conv-1');
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
