import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';
import {
  NOTIFICATION_TYPE,
  NotificationType,
} from '../../enums/notification-type.enum';
import { GraphQLJSON } from 'graphql-type-json';
registerEnumType(NOTIFICATION_TYPE, {
  name: 'NOTIFICATION_TYPE',
});
@ObjectType('Notification')
export class NotificationTypeGraphQL {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  body: string;

  @Field(() => NOTIFICATION_TYPE)
  type: NotificationType;

  @Field(() => String)
  receiverId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  meta?: Record<string, any>;

  @Field(() => Boolean)
  isRead: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
