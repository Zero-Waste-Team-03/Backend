import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NotificationStats {
  @Field(() => Int)
  unreadCount: number;
}
