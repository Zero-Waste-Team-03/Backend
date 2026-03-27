import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SendNotificationResponse')
export class SendNotificationResponseType {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}
