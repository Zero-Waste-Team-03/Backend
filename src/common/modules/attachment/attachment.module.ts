import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './entities/attachment.entity';
import { AttachmentService } from './attachment.service';
import { IsAttachmentExistConstraint } from './decorators/is-attachment-exist.decorator';

import { User } from '../../../core/user/entities/user.entity';
import { AttachmentCronService } from './attachment.cron';

@Module({
  imports: [TypeOrmModule.forFeature([Attachment, User])],
  providers: [
    AttachmentService,
    IsAttachmentExistConstraint,
    AttachmentCronService,
  ],
  exports: [AttachmentService],
})
export class AttachmentModule {}
