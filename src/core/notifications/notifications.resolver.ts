import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationTypeGraphQL } from './graphql/types/notification.type';
import { SendNotificationInput } from './graphql/inputs/send-notification.input';
import { PaginationQueryInput } from './graphql/inputs/pagination-query.input';
import { UpdateReadNotificationsInput } from './graphql/inputs/update-read-notification.input';
import { SendNotificationResponseType } from './graphql/types/responses.type';
import { MessageResponseType } from '../authentication/graphql/types/message-response.type';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { USER } from '../authentication/decorators/user.decorartor';

@Resolver(() => NotificationTypeGraphQL)
export class NotificationsResolver {
  private readonly logger = new Logger(NotificationsResolver.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(AccessTokenGuard)
  @Query(() => [NotificationTypeGraphQL], { name: 'notifications' })
  async getNotifications(
    @Args('pagination', { nullable: true }) pagination: PaginationQueryInput,
    @USER('id') userId: string,
  ) {
    return this.notificationsService.findAll(
      pagination || { limit: 10, page: 1 },
      userId,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => SendNotificationResponseType)
  async sendFcmNotification(
    @Args('input') input: SendNotificationInput,
    @USER('id') userId: string,
  ) {
    this.logger.log({
      message: 'Sending FCM notification from resolver',
      userId,
    });
    return this.notificationsService.sendNotification(
      input.title,
      input.body,
      userId,
      input.type,
      input.metaData,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType)
  async registerFcmToken(
    @Args('fcmToken') input: string,
    @USER('id') userId: string,
  ) {
    const result = await this.notificationsService.registerToken(input, userId);
    return { message: result.message };
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType)
  async markNotificationsAsRead(
    @Args('input') input: UpdateReadNotificationsInput,
    @USER('id') userId: string,
  ) {
    await this.notificationsService.updateRead(input.ids, userId);
    return { message: 'Notifications marked as read' };
  }
  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType)
  async markAllNotificationsAsRead(@USER('id') userId: string) {
    await this.notificationsService.updateAllRead(userId);
    return { message: 'Notifications marked as read' };
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType)
  async deleteNotification(
    @Args('id', { type: () => ID }) id: string,
    @USER('id') userId: string,
  ) {
    await this.notificationsService.remove(id, userId);
    return { message: 'Notification deleted' };
  }
}
