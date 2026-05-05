import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from 'nestjs-redis-client';
import { REDIS_PUBSUB_CHANNELS } from 'src/common/constants/redis-pubsub';
import { NotificationsService } from '../notifications.service';
import { SmartNotificationCommandEvent } from '../events/smart-notification-command.event';
import { createHash } from 'crypto';

type JsonObject = Record<string, unknown>;

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

    this.logger.log('Subscribed to smart notification command channel', {
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
    let eventId: string | undefined;
    let userId: string | undefined;

    try {
      const payload = JSON.parse(message) as unknown;

      if (!this.isJsonObject(payload)) {
        throw new Error(
          'Invalid smart notification message: payload must be object',
        );
      }

      if (typeof payload.eventId === 'string') {
        eventId = payload.eventId;
      }

      if (typeof payload.userId === 'string') {
        userId = payload.userId;
      }

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
    } catch (error) {
      const messageHash = createHash('sha256').update(message).digest('hex');
      this.logger.warn('Failed to process smart notification pubsub message', {
        eventId,
        userId,
        payloadHash: messageHash,
        payloadSize: message.length,
        reason: error instanceof Error ? error.message : 'Unknown error',
        context: 'SmartNotificationSubscriber',
      });
    }
  }

  private isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
