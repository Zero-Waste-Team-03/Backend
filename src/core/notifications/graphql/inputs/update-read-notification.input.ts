import { Field, InputType, ID } from '@nestjs/graphql';

@InputType()
export class UpdateReadNotificationsInput {
  @Field(() => [ID], {
    description: 'Array of notification IDs to mark as read',
  })
  ids: string[];
}
