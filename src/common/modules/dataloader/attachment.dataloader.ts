import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Attachment, UploadStatusValues } from '../attachment/entities/attachment.entity';
import { createAppError, throwAppError } from '../../errors';

@Injectable()
export class AttachmentDataLoader {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
  ) {}

  createLoader(): DataLoader<string, Attachment | null> {
    return new DataLoader<string, Attachment | null>(
      async (attachmentIds: readonly string[]) => {
        const attachments = await this.attachmentRepository.find({
          where: { id: In([...attachmentIds]) },
        });

        const attachmentMap = new Map(attachments.map((att) => [att.id, att]));
        return attachmentIds.map((id) => {
          const attachment = attachmentMap.get(id);
          if (attachment && attachment.uploadStatus === UploadStatusValues.FAILED) {
            throwAppError('UPLOAD_FAILED_ATTACHMENT', { id });
          }
          return attachment || null;
        });
      },
      {
        cache: true,
        batch: true,
      },
    );
  }
}
