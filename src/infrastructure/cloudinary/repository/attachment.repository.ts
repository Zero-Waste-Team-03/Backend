import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';

@Injectable()
export class AttachmentRepository {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {}

  async createAttachment(
    attachmentData: Partial<Attachment>,
  ): Promise<Attachment> {
    const attachment = this.attachmentRepo.create(attachmentData);
    return await this.attachmentRepo.save(attachment);
  }

  async getAttachmentById(id: string): Promise<Attachment | null> {
    return await this.attachmentRepo.findOne({ where: { id } });
  }
}
