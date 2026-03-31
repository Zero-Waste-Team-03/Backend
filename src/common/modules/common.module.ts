import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { AlsModule } from './async_storage/als.module';
import { DataLoaderModule } from './dataloader/dataloader.module';
import { AttachmentModule } from './attachment/attachment.module';
import { UploadModule } from './upload/upload.module';
import { ErrorsModule } from '../errors/errors.module';

@Module({
  imports: [
    MailerModule,
    AlsModule,
    DataLoaderModule,
    AttachmentModule,
    ErrorsModule,
    UploadModule,
  ],
  exports: [
    MailerModule,
    ErrorsModule,
    AlsModule,
    DataLoaderModule,
    AttachmentModule,
    UploadModule,
  ],
})
export class CommonModule {}
