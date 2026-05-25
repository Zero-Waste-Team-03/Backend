/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { Logger } from '@nestjs/common';
import { NOTIFICATION_JOBS } from 'src/common/constants/jobs';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { FirebaseService } from 'src/infrastructure/firebase/firebase.service';
import {
  NOTIFICATION_TYPE,
  NotificationType,
} from 'src/core/notifications/enums/notification-type.enum';
import { UserService } from 'src/core/user/v1/user.service';

class SendNotificationJob {
  title: string;
  body: string;
  userId: string;
  type: NotificationType;
  translationArgs?: Record<string, any>;
  idempotencyKey?: string;
}

class NotificationMessage {
  notification: {
    title: string;
    body: string;
    image?: string;
  };
  token: string;
  data?: Record<string, string>;
  android?: {
    collapseKey?: string;
    notification?: {
      imageUrl?: string;
    };
  };
  apns?: {
    fcmOptions?: {
      imageUrl?: string;
    };
  };
}

class TestNotificationJob {
  title: string;
  body: string;
  token: string;
}

export class InvalidTokenError extends Error {
  constructor(public readonly tokens: string[]) {
    super('Invalid FCM tokens detected');
    this.name = 'InvalidTokenError';
  }
}

@Processor(QUEUE_NAME.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly bodyMaxLength = 120;
  private readonly androidCollapseKey = 'com.zerowaste.zerowaste';

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly firebaseService: FirebaseService,
    private readonly userService: UserService,
  ) {
    super();
  }

  async process(
    job: Job<SendNotificationJob | TestNotificationJob, any, string>,
  ): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    switch (job.name) {
      case NOTIFICATION_JOBS.SEND_NOTIFICATION:
        this.logger.log('Processing notification job', {
          jobId: job.id,
          context: 'NotificationProcessor',
        });
        await this.handleSendingNotification(job.data as SendNotificationJob);
        return {
          message: 'Notification job processed',
          jobId: job.id,
        };

      case NOTIFICATION_JOBS.SEND_WITHOUT_SAVING:
        this.logger.log('Processing send-without-saving notification job', {
          jobId: job.id,
          context: 'NotificationProcessor',
        });
        await this.handleSendingNotification(job.data as SendNotificationJob);
        return {
          message: 'Notification (without saving) job processed',
          jobId: job.id,
        };

      case NOTIFICATION_JOBS.SEND_TEST_NOTIFICATION: {
        this.logger.log(`Processing test notification job: ${job.id}`);
        const { title, body, token } = job.data as TestNotificationJob;
        const message: NotificationMessage = {
          notification: {
            title,
            body,
          },
          token,
        };
        const response = await this.sendNotificationToOneDevice(message);
        return {
          message: 'Test notification sent',
          jobId: job.id,
          response,
        };
      }

      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return {
          message: 'Unknown job processed',
          jobId: job.id,
        };
    }
  }

  async sendNotificationToOneDevice(
    message: NotificationMessage,
  ): Promise<string> {
    this.logger.log('Sending notification to token', {
      tokenPrefix: message.token.substring(0, 20),
      context: 'NotificationProcessor',
    });

    try {
      return await this.firebaseService.getFcm().send(message);
    } catch (error) {
      this.logger.error('Failed to send notification to device', {
        tokenPrefix: message.token.substring(0, 20),
        error,
        context: 'NotificationProcessor',
      });
      throw error;
    }
  }

  async handleSendingNotification(data: SendNotificationJob): Promise<void> {
    this.logger.log('Handling sending notification', {
      userId: data.userId,
      title: data.title,
      type: data.type,
      idempotencyKey: data.idempotencyKey,
      context: 'NotificationProcessor',
    });

    const isPushEnabled = await this.isPushNotificationsEnabled(data.userId);
    if (!isPushEnabled) {
      this.logger.log('Skipping FCM send: push notifications disabled', {
        userId: data.userId,
        type: data.type,
        context: 'NotificationProcessor',
      });
      return;
    }

    const tokensWithLangs =
      await this.notificationsService.getActiveTokensForUser(data.userId);

    if (tokensWithLangs.length === 0) {
      this.logger.warn(`No active tokens found for user ${data.userId}`);
      return;
    }

    const meta = data.translationArgs ?? {};
    const dataPayload = this.buildDataPayload(
      data.type,
      data.idempotencyKey,
      meta,
    );
    const title = data.title;
    const body = this.buildNotificationBody(data.body);
    const imageUrl = this.resolveImageUrl(meta);

    const baseMessage: Omit<NotificationMessage, 'token'> = {
      notification: {
        title,
        body,
      },
      data: dataPayload,
    };

    if (imageUrl) {
      baseMessage.notification.image = imageUrl;
      baseMessage.android = {
        collapseKey: this.androidCollapseKey,
        notification: { imageUrl },
      };
      baseMessage.apns = { fcmOptions: { imageUrl } };
    } else {
      baseMessage.android = { collapseKey: this.androidCollapseKey };
    }

    const messages: NotificationMessage[] = tokensWithLangs.map(
      (tokenWithLang) => ({
        ...baseMessage,
        token: tokenWithLang.token,
      }),
    );

    const results = await Promise.allSettled(
      messages.map((message) => this.sendNotificationToOneDevice(message)),
    );

    const invalidTokens: string[] = [];
    let hasTransientError = false;

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason;
        if (this.isInvalidTokenError(error)) {
          invalidTokens.push(tokensWithLangs[index].token);
          this.logger.warn(
            `Invalid FCM token detected: ${tokensWithLangs[index].token.substring(0, 20)}...`,
          );
        } else if (this.isTransientError(error)) {
          hasTransientError = true;
          this.logger.warn(
            `Transient error detected for token: ${tokensWithLangs[index].token.substring(0, 20)}...`,
          );
        }
      }
    });

    if (invalidTokens.length > 0) {
      throw new InvalidTokenError(invalidTokens);
    }

    if (hasTransientError) {
      throw new Error(
        'Transient error occurred during notification sending, retrying...',
      );
    }

    this.logger.log('Notification Sent succefully', {
      message: 'Sending notification handled',
      totalTokens: tokensWithLangs.length,
      successfulTokens: results.filter((r) => r.status === 'fulfilled').length,
      invalidTokens: invalidTokens.length,
      context: 'NotificationProcessor',
    });
  }

  private buildNotificationBody(body: string): string {
    if (body.length <= this.bodyMaxLength) {
      return body;
    }
    return `${body.slice(0, Math.max(0, this.bodyMaxLength - 3))}...`;
  }

  private resolveImageUrl(meta: Record<string, any>): string | undefined {
    if (typeof meta.imageUrl === 'string' && meta.imageUrl) {
      return meta.imageUrl;
    }
    if (typeof meta.donationImageUrl === 'string' && meta.donationImageUrl) {
      return meta.donationImageUrl;
    }
    if (typeof meta.senderAvatarUrl === 'string' && meta.senderAvatarUrl) {
      return meta.senderAvatarUrl;
    }
    return undefined;
  }

  private buildDataPayload(
    type: NotificationType,
    idempotencyKey?: string,
    meta?: Record<string, any>,
  ): Record<string, string> {
    const normalizedMeta = this.normalizeMeta(meta);
    const dataPayload: Record<string, string> = {};

    for (const [key, value] of Object.entries(normalizedMeta)) {
      if (typeof value === 'string') {
        dataPayload[key] = value;
        continue;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        dataPayload[key] = String(value);
        continue;
      }

      dataPayload[key] = this.stringifyDataValue(value);
    }

    dataPayload.meta = this.stringifyDataValue(normalizedMeta);
    dataPayload.type = this.toMobileNotificationType(type);

    if (idempotencyKey) {
      dataPayload.idempotencyKey = idempotencyKey;
    }

    return dataPayload;
  }

  /**
   * Converts Firebase data values to strings while preserving JSON for objects.
   * @param value - Metadata value to place in the Firebase data payload.
   */
  private stringifyDataValue(value: any): string {
    try {
      const jsonValue = JSON.stringify(value);
      if (typeof jsonValue === 'string') {
        return jsonValue;
      }
    } catch {
      return String(value);
    }
    return String(value);
  }

  /**
   * Removes nullish metadata before building the Firebase data payload.
   * @param meta - Notification metadata from the queue job.
   */
  private normalizeMeta(meta?: Record<string, any>): Record<string, any> {
    if (!meta) {
      return {};
    }

    const normalizedMeta: Record<string, any> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (value === undefined || value === null) {
        continue;
      }
      normalizedMeta[key] = value;
    }
    return normalizedMeta;
  }

  /**
   * Converts persisted notification enum values to the mobile-facing contract.
   * @param type - Stored notification type value.
   */
  private toMobileNotificationType(type: NotificationType): string {
    const match = Object.entries(NOTIFICATION_TYPE).find(
      ([, value]) => value === type,
    );
    return match?.[0] ?? type;
  }

  private isInvalidTokenError(error: any): boolean {
    if (!error) return false;

    const errorCode = error.code || error.errorInfo?.code;
    const invalidTokenCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ];
    return invalidTokenCodes.includes(errorCode);
  }

  private isTransientError(error: any): boolean {
    if (!error) return false;
    const errorCode = error.code || error.errorInfo?.code;
    const transientErrorCodes = [
      'messaging/server-unavailable',
      'messaging/internal-error',
      'messaging/unavailable',
    ];
    return (
      transientErrorCodes.includes(errorCode) ||
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ETIMEDOUT')
    );
  }

  /**
   * Check whether a user has push notifications enabled.
   * Defaults to true when settings are missing.
   * @param userId - User identifier to resolve settings for.
   */
  private async isPushNotificationsEnabled(userId: string): Promise<boolean> {
    const settings = await this.userService.getUserSettings(userId);
    return settings?.isPushNotificationsEnabled ?? true;
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<SendNotificationJob | TestNotificationJob>) {
    if (job.name === NOTIFICATION_JOBS.SEND_TEST_NOTIFICATION) {
      this.logger.log(`Test notification job completed: ${job.id}`);
      return;
    }

    if (job.name === NOTIFICATION_JOBS.SEND_WITHOUT_SAVING) {
      this.logger.log(
        `Send-without-saving notification job completed: ${job.id}`,
      );
      return;
    }

    if (job.name === NOTIFICATION_JOBS.SEND_NOTIFICATION) {
      const { title, body, userId, type, translationArgs } =
        job.data as SendNotificationJob;
      await this.notificationsService.saveNotificationRecord(
        title,
        body,
        userId,
        type,
        translationArgs || {},
      );
      this.logger.log('Notification saved to DB', {
        jobId: job.id,
        context: 'NotificationProcessor',
      });
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<SendNotificationJob | TestNotificationJob>,
    error: Error,
  ) {
    if (error.name === 'InvalidTokenError' && (error as any).tokens) {
      const tokens = (error as any).tokens as string[];
      if (tokens.length > 0) {
        await Promise.all(
          tokens.map((token) => this.notificationsService.revokeToken(token)),
        );
        this.logger.log(`Auto-removed ${tokens.length} invalid FCM token(s)`);
      }
    } else if (this.isInvalidTokenError(error)) {
      const data = job.data as TestNotificationJob;
      if (data && data.token) {
        await this.notificationsService.revokeToken(data.token);
        this.logger.log(
          `Auto-removed 1 invalid FCM token from test notification`,
        );
      }
    }

    this.logger.error('Job failed', {
      jobId: job.id,
      reason: error.message,
      context: 'NotificationProcessor',
    });
  }
}
