import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  UploadStatus,
  UploadStatusValues,
} from '../entities/attachment.entity';

registerEnumType(() => UploadStatusValues, { name: 'UploadStatusValues' });
@ObjectType('Attachment')
export class AttachementType {
  @Field(() => String, { description: 'Attachment unique identifier' })
  id: string;

  @Field(() => String, { description: 'URL of the attachment', nullable: true })
  url: string;
  @Field(() => String, { description: 'Original file name of the attachment' })
  fileName: string;
  @Field(() => String, { description: 'MIME type of the attachment' })
  fileType: string;
  @Field(() => Number, { description: 'Size of the attachment in bytes' })
  fileSize: number;

  @Field(() => UploadStatusValues, {
    description: 'Current upload status of the attachment',
    nullable: true,
  })
  uploadStatus: UploadStatus;
  @Field(() => String, {
    description: 'ID of the user who uploaded the attachment',
  })
  uploadedById: string;
  @Field(() => String, {
    description: 'ID of the background job processing the upload',
    nullable: true,
  })
  jobId: string;

  @Field(() => Date, { description: 'Date the attachment was created' })
  createdAt: Date;

  @Field(() => Date, { description: 'Date the attachment was last updated' })
  updatedAt?: Date;
}
