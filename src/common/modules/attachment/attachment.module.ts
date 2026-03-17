import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './entities/attachment.entity';
import { AttachmentService } from './attachment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attachment])],
  providers: [AttachmentService],
  exports: [AttachmentService],
})
export class AttachmentModule {}
