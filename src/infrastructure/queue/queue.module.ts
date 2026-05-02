import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { QUEUE_NAME } from 'src/common/constants/queues';
import redisConfig from 'src/config/redis.config';
import { MailProcessor } from './mail/mail.processor';
import { UploadProcessor } from './upload/upload.processor';
import { NotificationsModule } from 'src/core/notifications/notifications.module';
import { CloudinaryModuleWrapper } from '../cloudinary/cloudinary.module';
import { EmailModule } from 'src/common/modules/email/email.module';
import { UserModule } from 'src/core/user/user.module';
import { AttachmentModule } from 'src/common/modules/attachment/attachment.module';
import { NotificationProcessor } from './notification/notification.processor';
import { ReservationProcessor } from './reservation/reservation.processor';
import { ReservationModule } from 'src/core/reservation/reservation.module';
import { ChatProcessor } from './chat/chat.processor';
import { GamificationProcessor } from './gamification/gamification.processor';
import { GamificationModule } from 'src/core/gamification/gamification.module';
import { BehaviorEventsProcessor } from './behavior-events/behavior-events.processor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from 'src/core/donation/entities/donation.entity';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigType<typeof redisConfig>) => {
        const redisHost = configService.host;
        const redisPort = configService.port;
        const redisUrl = `redis://${redisHost}:${redisPort}`;
        return {
          connection: {
            host: redisHost,
            port: redisPort,
            url: redisUrl,
            db: 3, // Default database
          },
        };
      },

      inject: [redisConfig.KEY],
    }),
    BullModule.registerQueue(
      ...Object.values(QUEUE_NAME).map((queueName) => ({
        name: queueName,
      })),
    ),
    CloudinaryModuleWrapper,
    EmailModule,
    UserModule,
    AttachmentModule,
    NotificationsModule,
    ReservationModule,
    GamificationModule,
    TypeOrmModule.forFeature([Donation]),
  ],
  providers: [
    MailProcessor,
    UploadProcessor,
    NotificationProcessor,
    ReservationProcessor,
    ChatProcessor,
    GamificationProcessor,
    BehaviorEventsProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
