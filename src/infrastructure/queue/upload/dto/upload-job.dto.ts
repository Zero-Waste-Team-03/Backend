import { UploadingOptions } from 'src/infrastructure/cloudinary/types/upload-options.interface';

export type UploadJobDto =
  | UploadFileDto
  | UploadFilesDto
  | DeleteFileDto
  | DeleteFilesDto;

export class UploadFileDto {
  file?: Express.Multer.File;
  userId?: string;
  attachmentId?: string;
  options: UploadingOptions;
}

export class UploadFilesDto {
  files?: Express.Multer.File[];
  userId?: string;
  attachmentIds?: string[];
  options: UploadingOptions;
}

export class DeleteFileDto {
  url?: string;
  attachmentId?: string;
}

export class DeleteFilesDto {
  attachments?: { url: string; attachmentId: string }[];
}
