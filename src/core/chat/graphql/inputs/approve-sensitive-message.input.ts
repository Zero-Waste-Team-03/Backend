import { Field, ID, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType('ApproveSensitiveMessageInput')
export class ApproveSensitiveMessageInput {
  @Field(() => ID)
  @IsUUID()
  conversationId: string;

  @Field(() => ID)
  @IsUUID()
  messageId: string;
}
