import { NotificationProcessor } from 'src/infrastructure/queue/notification/notification.processor';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { FirebaseService } from 'src/infrastructure/firebase/firebase.service';
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

  const userSettingsRepository = {
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips FCM send when push notifications are disabled', async () => {
    userSettingsRepository.findOne.mockResolvedValue({
      isPushNotificationsEnabled: false,
    });

    const processor = new NotificationProcessor(
      notificationsService,
      firebaseService,
      userSettingsRepository as any,
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
    userSettingsRepository.findOne.mockResolvedValue({
      isPushNotificationsEnabled: true,
    });
    (notificationsService.getActiveTokensForUser as jest.Mock).mockResolvedValue([
      { token: 'token-1' },
    ]);

    const processor = new NotificationProcessor(
      notificationsService,
      firebaseService,
      userSettingsRepository as any,
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
});
