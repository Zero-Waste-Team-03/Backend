import { NotificationsService } from 'src/core/notifications/notifications.service';
import type { Notification } from 'src/core/notifications/entities/notification.entity';
import type { Token } from 'src/core/notifications/entities/token.entity';
import type { Repository } from 'typeorm';
import type { Queue } from 'bullmq';

describe('NotificationsService', () => {
  const tokenRepo = {
    upsert: jest.fn(),
    delete: jest.fn(),
  } as unknown as Repository<Token>;

  const notificationRepo = {} as unknown as Repository<Notification>;
  const notificationQueue = {} as unknown as Queue;

  const buildService = () =>
    new NotificationsService(notificationRepo, tokenRepo, notificationQueue);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerToken', () => {
    it('upserts on (userId, deviceId) with the latest fcmToken', async () => {
      await buildService().registerToken('fcm-abc', 'user-1', 'device-1');

      expect(tokenRepo.upsert).toHaveBeenCalledWith(
        { fcmToken: 'fcm-abc', userId: 'user-1', deviceId: 'device-1' },
        ['userId', 'deviceId'],
      );
    });

    it('propagates repository errors', async () => {
      (tokenRepo.upsert as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      await expect(
        buildService().registerToken('fcm-x', 'user-1', 'device-1'),
      ).rejects.toThrow('boom');
    });
  });

  describe('revokeTokenForDevice', () => {
    it('deletes the row keyed by userId and deviceId', async () => {
      await buildService().revokeTokenForDevice('user-1', 'device-1');

      expect(tokenRepo.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        deviceId: 'device-1',
      });
    });
  });
});
