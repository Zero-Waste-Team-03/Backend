import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UserRole, UserRoleValues } from '../../entities/user.entity';

/**
 * Data Transfer Object for updating user information.
 * All fields are optional since it represents a partial update.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The email of the user',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'The display name of the user',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'A brief description or bio of the user',
    example: 'Zero waste enthusiast from New York.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'The role assigned to the user',
    enum: UserRoleValues,
  })
  @IsOptional()
  @IsEnum(UserRoleValues)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'The reputation score of the user',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  reputationScore?: number;

  @ApiPropertyOptional({
    description: 'Whether the user email is verified',
  })
  @IsOptional()
  @IsBoolean()
  isMailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'The ID of the location associated with the user',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'The ID of the attachment currently set as the user avatar',
  })
  @IsOptional()
  @IsUUID()
  avatarAttachmentId?: string;

  /**
   * For cases where the full attachment entity might be passed internally
   */
  @IsOptional()
  avatar?: any;
}
