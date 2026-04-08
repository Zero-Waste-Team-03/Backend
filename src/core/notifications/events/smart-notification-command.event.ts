import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  validateSync,
} from 'class-validator';
import {
  NOTIFICATION_TYPE_VALUES,
  NotificationType,
} from '../enums/notification-type.enum';
import { sanitizeNotificationText } from 'src/common/utils/sanitize-notification-text';

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 800;

export type SmartNotificationPayload = {
  eventId: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  save: boolean;
  meta?: Record<string, any>;
};

export class SmartNotificationCommandEvent {
  @IsDefined()
  @IsUUID()
  eventId: string;

  @IsDefined()
  @IsUUID()
  userId: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsDefined()
  @IsEnum(NOTIFICATION_TYPE_VALUES)
  type: NotificationType;

  @IsDefined()
  @IsBoolean()
  save: boolean;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;

  constructor(payload: SmartNotificationPayload) {
    this.eventId = payload.eventId;
    this.userId = payload.userId;
    this.title = sanitizeNotificationText(payload.title, MAX_TITLE_LENGTH);
    this.body = sanitizeNotificationText(payload.body, MAX_BODY_LENGTH);
    this.type = payload.type;
    this.save = payload.save;
    this.meta = payload.meta;

    const errors = validateSync(this, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new Error(`Invalid SmartNotificationCommandEvent payload`);
    }
  }
}
