import { Field, ObjectType, ID } from '@nestjs/graphql';
import { NotificationType } from '../../enums/notification-type.enum';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('Notification')
export class NotificationTypeGraphQL {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  body: string;

  @Field(() => String)
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
