import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { UPLOAD_JOBS } from 'src/common/constants/jobs';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { UploadJobDto } from './dto/upload-job.dto';
import { CloudinaryService } from 'src/infrastructure/cloudinary/cloudinary.service';
import { OAuthProfilePictureJobDto } from './dto/oauth-profile-picture-job';
import { OnWorkerEvent } from '@nestjs/bullmq';
import { UserService } from 'src/core/user/v1/user.service';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';
import { UploadStatusValues } from 'src/common/modules/attachment/entities/attachment.entity';

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
    private readonly userService: UserService,
    private readonly attachmentService: AttachmentService,
  ) {
    super();
  }

  /**
   * Processes an incoming job from the upload queue.
   * 
   * @param job - The job containing upload data (UploadJobDto or OAuthProfilePictureJobDto)
   * @param _token - Optional job token
   * @returns A promise that resolves with the result of the upload operation
   */
  process(
    job: Job<UploadJobDto | OAuthProfilePictureJobDto>,
    _token?: string,
  ): Promise<any> {
    switch (job.name) {
      case UPLOAD_JOBS.UPLOAD_OAUTH_PROFILE_PICTURE: {
        const data = job.data as OAuthProfilePictureJobDto;
        this.logger.log(
          `Uploading OAuth profile picture for user: ${data.userId}`,
        );
        return this.cloudinaryService.uploadFromUrl(data.pictureUrl, {
          uploadType: 'USER',
        });
      }

      case UPLOAD_JOBS.UPLOAD_FILE: {
        const data = job.data as UploadJobDto;
        if (data.url) {
          return this.cloudinaryService.uploadFromUrl(data.url, data.options);
        }
        if (!data.file) {
          throw new Error('Upload file buffer is missing');
        }
        return this.cloudinaryService.uploadFile(data.file, data.options);
      }

      case UPLOAD_JOBS.DELETE_FILE:
        throw new Error('Method not implemented.');

      default:
        return Promise.resolve({
          message: 'Upload job processed',
          jobId: job.id,
        });
    }
  }

  /**
   * Event handler triggered when an upload job is successfully completed.
   * For OAuth profile pictures, it creates an attachment and updates the user's avatar.
   * 
   * @param job - The completed job
   * @param result - The result returned from the process method (Cloudinary upload result)
   */
  @OnWorkerEvent('completed')
 async onQueueComplete(job: Job<any>, result: any) {
  if (job.name === UPLOAD_JOBS.UPLOAD_OAUTH_PROFILE_PICTURE) {
    const data = job.data as OAuthProfilePictureJobDto;
      const attachment = await this.attachmentService.createAttachment({
        url: result.secure_url,
        fileName: result.original_filename || `avatar_${data.userId}`,
        fileType: result.format || 'image/jpeg',
        fileSize: result.bytes || 0,
        uploadStatus: UploadStatusValues.COMPLETED,
        uploadedBy: { id: data.userId } as any,
        jobId: job.id,
      });
      await this.userService.updateUserWithoutReturn(data.userId, { avatar: attachment });
      this.logger.log(`Updated user avatar for user: ${data.userId}`);
    }
  }
}
