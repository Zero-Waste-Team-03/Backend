import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {}

  logger = new Logger(AttachmentService.name);
  async createAttachment(
    attachmentData: CreateAttachmentDto,
  ): Promise<Attachment> {
    const attachment = this.attachmentRepo.create(attachmentData);
    try {
      return await this.attachmentRepo.save(attachment);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getAttachmentById(id: string): Promise<Attachment | null> {
    return await this.attachmentRepo.findOne({ where: { id } });
  }

  async updateAttachment(
    id: string,
    attachmentData: UpdateAttachmentDto,
  ): Promise<Attachment> {
    await this.attachmentRepo.update(id, attachmentData);
    const updatedAttachment = await this.getAttachmentById(id);
    if (!updatedAttachment) {
      throw new Error(`Attachment with id ${id} not found`);
    }
    return updatedAttachment;
  }
}
