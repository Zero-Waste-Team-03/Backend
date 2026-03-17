import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { AlsModule } from './async_storage/als.module';
import { DataLoaderModule } from './dataloader/dataloader.module';
import { AttachmentModule } from './attachment/attachment.module';

@Module({
  imports: [MailerModule, AlsModule, DataLoaderModule, AttachmentModule],
  exports: [MailerModule, AlsModule, DataLoaderModule, AttachmentModule],
})
export class CommonModule { }
