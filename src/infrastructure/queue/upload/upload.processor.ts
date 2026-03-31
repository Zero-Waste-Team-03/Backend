import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { UPLOAD_JOBS } from 'src/common/constants/jobs';
import { QUEUE_NAME } from 'src/common/constants/queues';
import {
  DeleteFileDto,
  DeleteFilesDto,
  UploadFileDto,
  UploadFilesDto,
} from './dto/upload-job.dto';
import { CloudinaryService } from 'src/infrastructure/cloudinary/cloudinary.service';
import { OAuthProfilePictureJobDto } from './dto/oauth-profile-picture-job';
import { OnWorkerEvent } from '@nestjs/bullmq';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';
import { UploadStatusValues } from 'src/common/modules/attachment/entities/attachment.entity';
import { UploadApiResponse } from 'cloudinary';

/**
 * Processor for handling file upload background jobs.
 * This class handles different types of upload jobs including OAuth profile pictures
 * and general file uploads to Cloudinary.
 */
@Processor(QUEUE_NAME.UPLOAD)
export class UploadProcessor extends WorkerHost {
  private readonly logger = new Logger(UploadProcessor.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly attachmentService: AttachmentService,
  ) {
    super();
  }

  async process(
    job: Job<
      | UploadFileDto
      | UploadFilesDto
      | DeleteFileDto
      | DeleteFilesDto
      | OAuthProfilePictureJobDto
    >,
  ): Promise<any> {
    switch (job.name) {
      case UPLOAD_JOBS.UPLOAD_OAUTH_PROFILE_PICTURE: {
        const data = job.data as OAuthProfilePictureJobDto;
        this.logger.log(`Uploading attachment with id ${data.attachmentId}`);
        return this.cloudinaryService.uploadFromUrl(data.pictureUrl, {
          uploadType: 'USER_PROFILE',
        });
      }

      case UPLOAD_JOBS.UPLOAD_FILE: {
        const data = job.data as UploadFileDto;
        if (!data.file) {
          throw new Error('Upload file buffer is missing');
        }
        return this.cloudinaryService.uploadFile(data.file, data.options);
      }

      case UPLOAD_JOBS.UPLOAD_FILES: {
        const data = job.data as UploadFilesDto;
        if (!data.files || data.files.length === 0) {
          throw new Error('Upload files are missing');
        }
        const results: UploadApiResponse[] = [];
        try {
          for (const file of data.files) {
            const result = await this.cloudinaryService.uploadFile(
              file,
              data.options,
            );
            results.push(result);
          }
          return results;
        } catch (error) {
          // Cleanup: delete already uploaded files from Cloudinary
          this.logger.error('Batch upload failed, cleaning up...', error);
          for (const res of results) {
            await this.cloudinaryService.deleteFile(res.public_id);
          }
          throw error;
        }
      }

      case UPLOAD_JOBS.DELETE_FILE: {
        const data = job.data as DeleteFileDto;
        if (data.url) {
          const publicId = this.cloudinaryService.extractPublicIdFromUrl(
            data.url,
          );
          if (publicId) {
            await this.cloudinaryService.deleteFile(publicId);
          }
        }
        if (data.attachmentId) {
          await this.attachmentService.deleteAttachment(data.attachmentId);
        }
        return { success: true };
      }

      case UPLOAD_JOBS.DELETE_FILES: {
        const data = job.data as DeleteFilesDto;
        if (data.attachments) {
          for (const item of data.attachments) {
            const publicId = this.cloudinaryService.extractPublicIdFromUrl(
              item.url,
            );
            if (publicId) {
              await this.cloudinaryService.deleteFile(publicId);
            }
            await this.attachmentService.deleteAttachment(item.attachmentId);
          }
        }
        return { success: true };
      }

      default:
        return Promise.resolve({
          message: 'Upload job processed',
          jobId: job.id,
        });
    }
  }

  @OnWorkerEvent('completed')
  async onQueueComplete(
    job: Job<
      | UploadFileDto
      | UploadFilesDto
      | DeleteFileDto
      | DeleteFilesDto
      | OAuthProfilePictureJobDto
    >,
    result: UploadApiResponse | UploadApiResponse[],
  ) {
    if (job.name === UPLOAD_JOBS.UPLOAD_OAUTH_PROFILE_PICTURE) {
      const data = job.data as OAuthProfilePictureJobDto;
      const response = result as UploadApiResponse;
      await this.attachmentService.updateAttachment(data.attachmentId, {
        url: response.secure_url,
        uploadStatus: UploadStatusValues.COMPLETED,
      });
    }

    if (job.name === UPLOAD_JOBS.UPLOAD_FILE) {
      const data = job.data as UploadFileDto;
      const apiResponse = result as UploadApiResponse;
      if (data.attachmentId) {
        await this.attachmentService.updateAttachment(data.attachmentId, {
          url: apiResponse.secure_url,
          uploadStatus: UploadStatusValues.COMPLETED,
        });
      }
    }

    if (job.name === UPLOAD_JOBS.UPLOAD_FILES) {
      const data = job.data as UploadFilesDto;
      const results = result as UploadApiResponse[];
      if (data.attachmentIds && results) {
        for (let i = 0; i < results.length; i++) {
          await this.attachmentService.updateAttachment(data.attachmentIds[i], {
            url: results[i].secure_url,
            uploadStatus: UploadStatusValues.COMPLETED,
          });
        }
      }
    }

    if (job.name === UPLOAD_JOBS.DELETE_FILE) {
      const data = job.data as DeleteFileDto;
      this.logger.log(
        `DELETE_FILE job completed for attachment ${data.attachmentId}`,
      );
    }

    if (job.name === UPLOAD_JOBS.DELETE_FILES) {
      const data = job.data as DeleteFilesDto;
      this.logger.log(
        `DELETE_FILES job completed for ${data.attachments?.length ?? 0} attachment(s)`,
      );
    }
  }

  @OnWorkerEvent('failed')
  async onQueueFailed(
    job: Job<
      | UploadFileDto
      | UploadFilesDto
      | DeleteFileDto
      | DeleteFilesDto
      | OAuthProfilePictureJobDto
    >,
    error: Error,
  ) {
    this.logger.error(
      `Job [${job.name}] failed (id=${job.id}): ${error.message}`,
    );

    if (job.name === UPLOAD_JOBS.UPLOAD_FILE) {
      const data = job.data as UploadFileDto;
      if (data.attachmentId) {
        await this.attachmentService.updateAttachment(data.attachmentId, {
          uploadStatus: UploadStatusValues.FAILED,
        });
        this.logger.log(
          `Marked attachment record ${data.attachmentId} as failed due to upload failure`,
        );
      }
    }

    if (job.name === UPLOAD_JOBS.UPLOAD_FILES) {
      const data = job.data as UploadFilesDto;
      if (data.attachmentIds) {
        await Promise.all(
          data.attachmentIds.map((id) =>
            this.attachmentService.updateAttachment(id, {
              uploadStatus: UploadStatusValues.FAILED,
            }),
          ),
        );
        this.logger.log(
          `Marked attachment records [${data.attachmentIds.join(',')}] as failed due to upload failure`,
        );
      }
    }

    if (job.name === UPLOAD_JOBS.UPLOAD_OAUTH_PROFILE_PICTURE) {
      const data = job.data as OAuthProfilePictureJobDto;
      if (data.attachmentId) {
        await this.attachmentService.updateAttachment(data.attachmentId, {
          uploadStatus: UploadStatusValues.FAILED,
        });
        this.logger.log(
          `Marked OAuth attachment record ${data.attachmentId} as failed due to failure`,
        );
      }
    }

    if (job.name === UPLOAD_JOBS.DELETE_FILE) {
      const data = job.data as DeleteFileDto;
      this.logger.error(
        `DELETE_FILE job failed for attachment ${data.attachmentId} (url=${data.url}): ${error.message}`,
      );
    }

    if (job.name === UPLOAD_JOBS.DELETE_FILES) {
      const data = job.data as DeleteFilesDto;
      this.logger.error(
        `DELETE_FILES job failed for ${data.attachments?.length ?? 0} attachment(s): ${error.message}`,
      );
    }
  }
}
