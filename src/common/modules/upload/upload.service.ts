import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { UPLOAD_JOBS } from 'src/common/constants/jobs';
import { AttachmentService } from '../attachment/attachment.service';
import { UploadStatusValues } from '../attachment/entities/attachment.entity';
import { DataSource, EntityManager } from 'typeorm';
import { UploadingOptions } from 'src/infrastructure/cloudinary/types/upload-options.interface';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @InjectQueue(QUEUE_NAME.UPLOAD) private readonly uploadQueue: Queue,
    private readonly attachmentService: AttachmentService,
    private readonly dataSource: DataSource,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId?: string,
    options?: UploadingOptions,
  ) {
    const attachment = await this.attachmentService.createAttachment({
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedById: userId,
      uploadStatus: UploadStatusValues.PENDING,
    });

    const job = await this.uploadQueue.add(UPLOAD_JOBS.UPLOAD_FILE, {
      file,
      attachmentId: attachment.id,
      userId,
      options,
    });

    await this.attachmentService.updateAttachment(attachment.id, {
      jobId: job.id,
    });

    return { attachmentId: attachment.id, jobId: job.id };
  }

  async uploadFiles(
    files: Express.Multer.File[],
    userId?: string,
    options?: UploadingOptions,
  ) {
    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 files allowed');
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const attachmentsData = files.map((file) => ({
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedById: userId,
        uploadStatus: UploadStatusValues.PENDING,
      }));

      const attachments = await Promise.all(
        attachmentsData.map((data) =>
          this.attachmentService.createAttachment(data, manager),
        ),
      );

      const attachmentIds = attachments.map((a) => a.id);

      const job = await this.uploadQueue.add(UPLOAD_JOBS.UPLOAD_FILES, {
        files,
        attachmentIds,
        userId,
        options,
      });

      await Promise.all(
        attachmentIds.map((id) =>
          this.attachmentService.updateAttachment(
            id,
            { jobId: job.id },
            manager,
          ),
        ),
      );

      return { attachmentIds, jobId: job.id };
    });
  }

  async deleteFile(id: string) {
    //eslint-disable-next-line
    const attachment = await this.attachmentService.getAttachmentUrl(id);
    if (!attachment) {
      throw new BadRequestException(`Attachment ${id} not found`);
    }

    if (!attachment.url) {
      await this.attachmentService.deleteAttachment(id);
      return { success: true };
    }

    const job = await this.uploadQueue.add(UPLOAD_JOBS.DELETE_FILE, {
      attachmentId: id,
      url: attachment.url,
    });

    return { jobId: job.id };
  }

  async deleteFiles(ids: string[]) {
    if (!ids || ids.length === 0)
      throw new BadRequestException('Ids are required');

    const attachments = await Promise.all(
      ids.map((id) => this.attachmentService.getAttachmentUrl(id)),
    );

    const missing = ids.filter((_, i) => !attachments[i]);
    if (missing.length > 0)
      throw new BadRequestException(
        `Attachments not found: ${missing.join(', ')}`,
      );

    const withUrl = attachments
      .filter((a) => a!.url)
      .map((a) => ({ attachmentId: a!.id, url: a!.url }));

    const withoutUrl = attachments.filter((a) => !a!.url).map((a) => a!.id);

    if (withoutUrl.length > 0)
      await this.attachmentService.deleteAttachments(withoutUrl);

    if (withUrl.length > 0) {
      const job = await this.uploadQueue.add(UPLOAD_JOBS.DELETE_FILES, {
        attachments: withUrl,
      });
      return { jobId: job.id };
    }

    return { success: true };
  }
}
