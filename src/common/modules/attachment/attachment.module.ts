import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './entities/attachment.entity';
import { AttachmentService } from './attachment.service';
import { IsAttachmentExistConstraint } from './decorators/is-attachment-exist.decorator';

@Module({
  imports: [TypeOrmModule.forFeature([Attachment])],
  providers: [AttachmentService, IsAttachmentExistConstraint],
  exports: [AttachmentService],
})
export class AttachmentModule {}
