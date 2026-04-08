import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from 'nestjs-redis-client';
import { REDIS_PUBSUB_CHANNELS } from 'src/common/constants/redis-pubsub';
import { NotificationsService } from '../notifications.service';
import {
  SmartNotificationCommandEvent,
  SmartNotificationPayload,
} from '../events/smart-notification-command.event';

@Injectable()
export class SmartNotificationSubscriberService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SmartNotificationSubscriberService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redisService.subscribe(
      REDIS_PUBSUB_CHANNELS.SMART_NOTIFICATION_COMMAND,
      async (message) => {
        await this.handleMessage(message);
      },
    );

    this.logger.log({
      message: 'Subscribed to smart notification command channel',
      channel: REDIS_PUBSUB_CHANNELS.SMART_NOTIFICATION_COMMAND,
      context: 'SmartNotificationSubscriber',
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisService.unsubscribe(
      REDIS_PUBSUB_CHANNELS.SMART_NOTIFICATION_COMMAND,
    );
  }

  private async handleMessage(message: string): Promise<void> {
    try {
      const payload = JSON.parse(message) as SmartNotificationPayload;
      const event = new SmartNotificationCommandEvent(payload);

      if (event.save) {
        await this.notificationsService.sendNotification(
          event.title,
          event.body,
          event.userId,
          event.type,
          event.meta,
        );
      } else {
        await this.notificationsService.sendNotificationWithoutSaving(
          event.title,
          event.body,
          event.userId,
          event.type,
          event.meta,
        );
      }
    } catch {
      this.logger.warn({
        message: 'Failed to process smart notification pubsub message',
        rawMessage: message,
        context: 'SmartNotificationSubscriber',
      });
    }
  }
}
