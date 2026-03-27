import { Field, InputType } from '@nestjs/graphql';
import {
  NOTIFICATION_TYPE_VALUES,
  NotificationType,
} from '../../enums/notification-type.enum';
import { GraphQLJSON } from 'graphql-type-json';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

@InputType()
export class SendNotificationInput {
  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => String)
  @IsString()
  body: string;

  @Field(() => String)
  @IsEnum(NOTIFICATION_TYPE_VALUES)
  type: NotificationType;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  metaData?: Record<string, any>;
}
