import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './entities/token.entity';
import { Notification } from './entities/notification.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { SmartNotificationSubscriberService } from './pubsub/smart-notification-subscriber.service';
import { SmartBehaviorPublisherService } from './pubsub/smart-behavior-publisher.service';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Token, Notification]),
    ScheduleModule.forRoot(),
    UserModule,
  ],
  controllers: [],
  providers: [
    NotificationsService,
    NotificationsResolver,
    SmartNotificationSubscriberService,
    SmartBehaviorPublisherService,
  ],
  exports: [NotificationsService, SmartBehaviorPublisherService],
})
export class NotificationsModule {}
