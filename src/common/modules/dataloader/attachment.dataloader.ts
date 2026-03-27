import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Attachment } from '../attachment/entities/attachment.entity';

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

        // Map the results back to the original ids order
        const attachmentMap = new Map(attachments.map((att) => [att.id, att]));
        return attachmentIds.map((id) => attachmentMap.get(id) || null);
      },
      {
        cache: true,
        batch: true,
      },
    );
  }
}
