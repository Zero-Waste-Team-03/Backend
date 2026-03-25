import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  ParseUUIDPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import {
  UploadFileDto,
  UploadFilesDto,
  DeleteFilesDto,
} from './dto/upload-request.dto';
import { USER } from 'src/core/authentication/decorators/user.decorartor';
import { AccessTokenGuard } from 'src/core/authentication/guards/access-token.guard';
import {
  UploadType,
  UploadTypeValues,
} from 'src/infrastructure/cloudinary/types/upload-options.interface';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(AccessTokenGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiQuery({
    name: 'uploadType',
    enum: UploadTypeValues,
    required: false,
    description: 'The type/context of the upload',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @USER('id') userId: string,
    @Query('uploadType') uploadType?: UploadType,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.uploadService.uploadFile(
      file,
      userId,
      uploadType ? { uploadType } : undefined,
    );
  }

  @Post('files')
  @ApiOperation({ summary: 'Upload multiple files (max 5)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFilesDto })
  @ApiQuery({
    name: 'uploadType',
    enum: UploadTypeValues,
    required: false,
    description: 'The type/context of the upload',
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @USER('id') userId: string,
    @Query('uploadType') uploadType?: UploadType,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Files are required');
    }
    return this.uploadService.uploadFiles(
      files,
      userId,
      uploadType ? { uploadType } : undefined,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single file by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @USER('id') userId: string,
  ) {
    return this.uploadService.deleteFile(id, userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete multiple files by IDs' })
  @ApiBody({ type: DeleteFilesDto })
  async deleteFiles(@Body() body: DeleteFilesDto, @USER('id') userId: string) {
    return this.uploadService.deleteFiles(body.ids, userId);
  }
}
