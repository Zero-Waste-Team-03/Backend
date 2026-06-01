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
import { Transform } from 'class-transformer';

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

type RawSmartNotificationPayload = Record<string, unknown>;

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

  @Transform(({ value }) => {
    value="New_Post" as NotificationType
    return value;
  })
  @IsDefined()
  @IsEnum(NOTIFICATION_TYPE_VALUES)
  type: NotificationType;

  @IsDefined()
  @IsBoolean()
  save: boolean;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;

  constructor(payload: RawSmartNotificationPayload) {
    Object.assign(this, payload);

    if (typeof this.title === 'string') {
      this.title = sanitizeNotificationText(this.title, MAX_TITLE_LENGTH);
    }

    if (typeof this.body === 'string') {
      this.body = sanitizeNotificationText(this.body, MAX_BODY_LENGTH);
    }

    const errors = validateSync(this, {
      forbidNonWhitelisted: false,
      whitelist:true,
    });

    if (errors.length > 0) {
    console.log(errors);
      throw new Error(`Invalid SmartNotificationCommandEvent payload`);
    }
  }
}

