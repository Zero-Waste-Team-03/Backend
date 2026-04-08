import { SmartNotificationSubscriberService } from 'src/core/notifications/pubsub/smart-notification-subscriber.service';
import { REDIS_PUBSUB_CHANNELS } from 'src/common/constants/redis-pubsub';
import { NOTIFICATION_TYPE } from 'src/core/notifications/enums/notification-type.enum';

describe('SmartNotificationSubscriberService', () => {
  const redisService = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };

  const notificationsService = {
    sendNotification: jest.fn(),
    sendNotificationWithoutSaving: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes and routes save=true messages', async () => {
    let callback: ((message: string) => Promise<void>) | undefined;
    redisService.subscribe.mockImplementation(
      async (_channel: string, cb: (message: string) => Promise<void>) => {
        callback = cb;
      },
    );

    const service = new SmartNotificationSubscriberService(
      redisService as any,
      notificationsService as any,
    );

    await service.onModuleInit();

    await callback?.(
      JSON.stringify({
        eventId: '6e57ce83-c965-4b4f-bc2b-3341f9409c6d',
        userId: '68a9c74f-53fb-45d7-b9f8-f8e1833737d8',
        title: 'Alert',
        body: 'Please check nearby donation',
        type: NOTIFICATION_TYPE.MESSAGE,
        save: true,
      }),
    );

    expect(redisService.subscribe).toHaveBeenCalledWith(
      REDIS_PUBSUB_CHANNELS.SMART_NOTIFICATION_COMMAND,
      expect.any(Function),
    );
    expect(notificationsService.sendNotification).toHaveBeenCalledTimes(1);
    expect(
      notificationsService.sendNotificationWithoutSaving,
    ).not.toHaveBeenCalled();
  });

  it('routes save=false messages to no-save notification path', async () => {
    let callback: ((message: string) => Promise<void>) | undefined;
    redisService.subscribe.mockImplementation(
      async (_channel: string, cb: (message: string) => Promise<void>) => {
        callback = cb;
      },
    );

    const service = new SmartNotificationSubscriberService(
      redisService as any,
      notificationsService as any,
    );

    await service.onModuleInit();

    await callback?.(
      JSON.stringify({
        eventId: 'dce8e5cf-6e5e-4cc2-8327-f7d66db4f2c2',
        userId: '9464f9e4-359d-423d-aebb-0208b7e4dc38',
        title: 'Ping',
        body: 'No persistence needed',
        type: NOTIFICATION_TYPE.MESSAGE,
        save: false,
      }),
    );

    expect(
      notificationsService.sendNotificationWithoutSaving,
    ).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes on destroy', async () => {
    const service = new SmartNotificationSubscriberService(
      redisService as any,
      notificationsService as any,
    );

    await service.onModuleDestroy();

    expect(redisService.unsubscribe).toHaveBeenCalledWith(
      REDIS_PUBSUB_CHANNELS.SMART_NOTIFICATION_COMMAND,
    );
  });
});
