import { PartialType } from '@nestjs/swagger';
import { CreateAttachmentDto } from './create-attachment.dto';

/**
 * Data Transfer Object for updating an attachment.
 * Uses PartialType to make all fields from CreateAttachmentDto optional.
 */
export class UpdateAttachmentDto extends PartialType(CreateAttachmentDto) {}
