import { Field, InputType, ID } from '@nestjs/graphql';
import { IsArray, IsUUID } from 'class-validator';

@InputType()
export class UpdateReadNotificationsInput {
  @IsArray()
  @IsUUID('all', { each: true })
  @Field(() => [ID], {
    description: 'Array of notification IDs to mark as read',
  })
  ids: string[];
}
