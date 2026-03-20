import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import {
  UploadStatus,
  UploadStatusValues,
} from '../entities/attachment.entity';
import { User } from '../../../../core/user/entities/user.entity';

/**
 * Data Transfer Object for creating an attachment.
 */
export class CreateAttachmentDto {
  @ApiProperty({
    description: 'The name of the file',
    example: 'avatar_user123.jpg',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'The MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  fileType: string;

  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 1024,
  })
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({
    description: 'The URL where the file is stored',
    example: 'https://cloudinary.com/v1_1/demo/image/upload/sample.jpg',
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({
    description: 'The user who uploaded the file',
  })
  @IsOptional()
  @IsUUID()
  uploadedById?: string;

  @ApiPropertyOptional({
    description: 'The current status of the upload',
    enum: UploadStatusValues,
    default: UploadStatusValues.PENDING,
  })
  @IsOptional()
  @IsEnum(UploadStatusValues)
  uploadStatus?: UploadStatus;

  @ApiPropertyOptional({
    description: 'The background job ID associated with the upload',
  })
  @IsOptional()
  @IsString()
  jobId?: string;
}
