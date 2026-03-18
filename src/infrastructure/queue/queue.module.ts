import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { QUEUE_NAME } from 'src/common/constants/queues';
import redisConfig from 'src/config/redis.config';
import { MailProcessor } from './mail/mail.processor';
import { UploadProcessor } from './upload/upload.processor';
import { CloudinaryModuleWrapper } from '../cloudinary/cloudinary.module';
import { EmailModule } from 'src/common/modules/email/email.module';
import { UserModule } from 'src/core/user/user.module';
import { AttachmentModule } from 'src/common/modules/attachment/attachment.module';

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
  ],
  providers: [MailProcessor, UploadProcessor],
  exports: [BullModule],
})
export class QueueModule { }
