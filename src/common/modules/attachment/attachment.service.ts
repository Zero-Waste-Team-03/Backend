import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Attachment, UploadStatusValues } from './entities/attachment.entity';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { throwAppError } from '../../errors';

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {}

  logger = new Logger(AttachmentService.name);

  async createAttachment(
    attachmentData: CreateAttachmentDto,
    manager?: EntityManager,
  ): Promise<Attachment> {
    const repo = manager
      ? manager.getRepository(Attachment)
      : this.attachmentRepo;
    const attachment = repo.create(attachmentData);
    try {
      return await repo.save(attachment);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getAttachmentById(
    id: string,
    uploadedById?: string,
    manager?: EntityManager,
  ): Promise<Attachment> {
    const repo = manager
      ? manager.getRepository(Attachment)
      : this.attachmentRepo;
    const attachment = await repo.findOneOrFail({
      where: { id, ...(uploadedById !== undefined && { uploadedById }) },
    });

    if (attachment && attachment.uploadStatus === UploadStatusValues.FAILED) {
      throwAppError('UPLOAD_FAILED_ATTACHMENT', { id: attachment.id });
    }

    return attachment;
  }

  async getAttachmentUrl(
    id: string,
    uploadedById?: string,
  ): Promise<{ url: string; id: string } | null> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id, ...(uploadedById !== undefined && { uploadedById }) },
      select: { url: true, id: true, uploadStatus: true },
    });

    if (attachment && attachment.uploadStatus === UploadStatusValues.FAILED) {
      throwAppError('UPLOAD_FAILED_ATTACHMENT', { id: attachment.id });
    }

    if (!attachment) return null;
    return { id: attachment.id, url: attachment.url };
  }

  async updateAttachment(
    id: string,
    attachmentData: UpdateAttachmentDto,
    manager?: EntityManager,
  ): Promise<Attachment> {
    const repo = manager
      ? manager.getRepository(Attachment)
      : this.attachmentRepo;
    const { affected } = await repo.update(id, attachmentData);
    if (!affected) {
      throw new Error(`Attachment with id ${id} not found`);
    }
    const updatedAttachment = await this.getAttachmentById(
      id,
      undefined,
      manager,
    );
    if (!updatedAttachment) {
      throw new Error(`Attachment with id ${id} not found`);
    }
    return updatedAttachment;
  }

  async deleteAttachment(id: string): Promise<void> {
    const { affected } = await this.attachmentRepo.delete(id);
    if (!affected) {
      this.logger.warn(`deleteAttachment: record ${id} not found, skipping`);
    }
  }

  async deleteAttachments(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { affected } = await this.attachmentRepo.delete(ids);
    if (!affected || affected !== ids.length) {
      this.logger.warn(
        `deleteAttachments: expected to delete ${ids.length}, actually deleted ${affected ?? 0}`,
      );
    }
  }
}
