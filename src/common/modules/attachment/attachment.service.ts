import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {}

  logger = new Logger(AttachmentService.name)
  async createAttachment(
    attachmentData: Partial<Attachment>,
  ): Promise<Attachment> {
    const attachment = this.attachmentRepo.create(attachmentData);
    try{
     return await this.attachmentRepo.save(attachment);
    } catch(e){
      this.logger.error(e);
      throw e;
    }
  }

  async getAttachmentById(id: string): Promise<Attachment | null> {
    return await this.attachmentRepo.findOne({ where: { id } });
  }
}
