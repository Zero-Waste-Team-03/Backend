import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  NotificationType,
  NOTIFICATION_TYPE_VALUES,
} from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsUUID(7)
  receiverId: string;

  @IsEnum(NOTIFICATION_TYPE_VALUES)
  type: NotificationType;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean = false;

  @IsOptional()
  meta?: Record<string, any>;
}
