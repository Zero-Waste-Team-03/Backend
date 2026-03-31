import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Attachment, UploadStatusValues } from './entities/attachment.entity';
import { User } from 'src/core/user/entities/user.entity';

@Injectable()
export class AttachmentCronService {
  private readonly logger = new Logger(AttachmentCronService.name);

  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleFailedAttachments() {
    this.logger.log('Running midnight cron to handle failed attachments...');

    try {
      const failedAttachments = await this.attachmentRepository.find({
        where: { uploadStatus: UploadStatusValues.FAILED },
        select: ['id'],
      });

      if (!failedAttachments.length) {
        this.logger.log('No failed attachments found to process.');
        return;
      }

      const attachmentIds = failedAttachments.map((a) => a.id);
      this.logger.log(`Found ${attachmentIds.length} failed attachments. Processing...`);

      const updateResult = await this.userRepository.update(
        { avatarAttachmentId: In(attachmentIds) },
        { avatarAttachmentId: null as any },
      );
      
      if (updateResult.affected && updateResult.affected > 0) {
        this.logger.log(`Set avatar to null for ${updateResult.affected} user profile(s).`);
      }

      const deleteResult = await this.attachmentRepository.delete({ id: In(attachmentIds) });
      
      this.logger.log(`Deleted ${deleteResult.affected} failed attachments successfully.`);
    } catch (error) {
      this.logger.error('Failed to process cleanup for failed attachments', error);
    }
  }
}
