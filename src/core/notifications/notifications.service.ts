import { Injectable, Logger } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';
import { Token } from './entities/token.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType } from './enums/notification-type.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SendNotificationResponseDto } from './dto/send-notification-response.dto';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { NOTIFICATION_JOBS } from 'src/common/constants/jobs';
import { isError } from 'lodash';
import { throwAppError } from 'src/common/errors';

const OLD_NOTIFICATION_DELETE_DAYS = 7;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Token)
    private readonly tokenRepo: Repository<Token>,
    @InjectQueue(QUEUE_NAME.NOTIFICATION)
    private readonly notificationQueue: Queue,
  ) {}

  logger = new Logger(NotificationsService.name);

  /**
   * Cron job to delete old notifications that are older than one week and have been read.
   * Runs every week.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async handleCron() {
    this.logger.log({
      message: 'Running cron job to delete old notifications',
      daysOld: OLD_NOTIFICATION_DELETE_DAYS,
      context: 'Notifications',
    });
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - OLD_NOTIFICATION_DELETE_DAYS);
    await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :oneWeekAgo', { oneWeekAgo })
      .andWhere('isRead = :isRead', { isRead: true })
      .execute();
    this.logger.log({
      message: 'Old notifications deleted',
      context: 'Notifications',
    });
  }

  /**
   * Creates a new notification record in the database.
   * @param dto - The data transfer object containing notification details.
   * @returns A promise that resolves to the newly created notification.
   */
  create(dto: CreateNotificationDto) {
    const notification = this.notificationRepo.create(dto);
    return this.notificationRepo.save(notification);
  }

  /**
   * Retrieves a paginated list of notifications.
   * @param paginationaQuery - The pagination query parameters.
   * @returns A promise that resolves to a list of notifications.
   */
  async findAll(paginationQuery: PaginationQueryDto, userId: string) {
    const { limit, page } = paginationQuery;
    const notification = await this.notificationRepo.find({
      skip: (page - 1) * limit,
      take: limit,
      where: { receiverId: userId },
      order: { createdAt: 'DESC' },
    });
    return notification;
  }

  /**
   * Retrieves a single notification by its ID.
   * @param id - The ID of the notification to retrieve.
   * @returns A promise that resolves to the notification, or undefined if not found.
   */
  async findOne(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id, receiverId: userId },
    });
    if (!notification) {
      throwAppError('NOTIFICATION_NOT_FOUND');
    }
    return notification;
  }

  /**
   * Marks a list of notifications as read.
   * @param ids - An array of notification IDs to mark as read.
   * @returns A promise that resolves when the update is complete.
   */
  async updateRead(ids: string[], userId: string) {
    await this.notificationRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .whereInIds(ids)
      .where('receiverId = :userId', { userId })
      .execute();
  }

  /**
   * Removes a notification by its ID.
   * @param id - The ID of the notification to remove.
   * @param userId - The ID of the user attempting to remove the notification (for authorization, though not used in current implementation).
   * @returns A promise that resolves when the removal is complete.
   */
  async remove(id: string, userId: string) {
    try {
      await this.notificationRepo.delete({ id, receiverId: userId });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throwAppError('NOTIFICATION_NOT_FOUND');
    }
  }

  /**
   * Saves a new notification record to the database.
   * @param title - The title of the notification.
   * @param body - The body/content of the notification.
   * @param receiverId - The ID of the user who will receive the notification.
   * @param type - The type of the notification.
   * @returns A promise that resolves to the saved notification record.
   */
  async saveNotificationRecord(
    title: string,
    body: string,
    receiverId: string,
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<Notification> {
    const createNotificationDto: CreateNotificationDto = {
      title,
      body,
      receiverId,
      type,
      isRead: false,
      meta: data,
    };
    return this.create(createNotificationDto);
  }

  // FcmTokenService methods
  /**
   * Registers an FCM token for a specific user.
   * @param dto - The data transfer object containing the FCM token and device type.
   * @param userId - The ID of the user registering the token.
   * @returns A promise that resolves to a success message.
   */
  async registerToken(
    fcmToken: string,
    userId: string,
  ): Promise<{ message: string }> {
    try {
      await this.tokenRepo.upsert(
        {
          fcmToken,
          userId,
        },
        ['fcmToken'],
      );

      this.logger.log({
        message: 'FCM token registered/updated',
        userId,
        context: 'Notifications',
      });
      return { message: 'Token registered successfully' };
    } catch (error) {
      this.logger.error(
        'Failed to register token',
        isError(error) ? error.message : JSON.stringify(error),
      );
      throw error;
    }
  }
  /**
   * Retrieves all active FCM tokens for a given user.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to an array of FCM tokens.
   * @throws {BadRequestException} If no active tokens are found for the user.
   */
  async getActiveTokensForUser(userId: string): Promise<
    {
      token: string;
    }[]
  > {
    const tokens = await this.tokenRepo.find({ where: { userId } });
    if (!tokens || tokens.length === 0) {
      throwAppError('NOTIFICATION_NO_ACTIVE_TOKENS');
    }
    return tokens.map((token) => {
      return { token: token.fcmToken };
    });
  }

  /**
   * Revokes (deletes) a specific FCM token.
   * @param token - The FCM token string to revoke.
   * @returns A promise that resolves when the token is deleted.
   */
  async revokeToken(token: string): Promise<void> {
    await this.tokenRepo.delete({ fcmToken: token });
  }

  /**
   * Revokes all FCM tokens for a specific user (logout all devices).
   * @param userId - The ID of the user.
   * @returns A promise that resolves when all tokens are deleted.
   */
  async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.tokenRepo.delete({ userId });
  }

  /**
   * Handles user logout by removing FCM token(s).
   * If fcmToken is provided, removes only that token.
   * If fcmToken is not provided, removes all tokens for the user.
   * @param userId - The ID of the user logging out.
   * @param fcmToken - Optional specific FCM token to remove.
   * @returns A promise that resolves to a success message.
   */
  async deleteToken(fcmToken: string): Promise<{ message: string }> {
    await this.revokeToken(fcmToken);
    this.logger.log({
      message: 'Logged out from device',
      context: 'Notifications',
    });
    return { message: 'Logged out from device successfully' };
  }

  // FcmService methods
  /**
   * Adds a notification job to the queue for sending.
   * @param title - The title of the notification.
   * @param body - The body/content of the notification.
   * @param userId - The ID of the user to whom the notification is to be sent.
   * @param type - The type of the notification.
   * @returns A promise that resolves to a success response indicating the job was added.
   */
  async sendNotification(
    title: string,
    body: string,
    userId: string,
    type: NotificationType,
    data?: Record<string, any>,
  ): Promise<SendNotificationResponseDto> {
    await this.notificationQueue.add(
      NOTIFICATION_JOBS.SEND_NOTIFICATION,
      {
        title,
        body,
        userId,
        type,
        translationArgs: data,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );
    this.logger.log({
      message: 'Notification job added to queue',
      userId,
      title,
      type,
      context: 'Notifications',
    });
    return { success: true, message: 'Notification job added to queue' };
  }
}
