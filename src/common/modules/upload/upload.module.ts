import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { AttachmentModule } from '../attachment/attachment.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAME.UPLOAD,
    }),
    AttachmentModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
