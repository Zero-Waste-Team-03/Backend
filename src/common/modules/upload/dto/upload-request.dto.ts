import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}

export class UploadFilesDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    maxItems: 5,
  })
  files: any[];
}

export class DeleteFilesDto {
  @ApiProperty({ type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1, { message: 'At least one ID is required' })
  @ArrayMaxSize(5, { message: 'At most 5 IDs are allowed' })
  ids: string[];
}
