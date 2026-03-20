import { UploadingOptions } from 'src/infrastructure/cloudinary/types/upload-options.interface';

export class UploadJobDto {
  file?: Express.Multer.File;
  url?: string;
  userId?: string;
  options: UploadingOptions;
}
