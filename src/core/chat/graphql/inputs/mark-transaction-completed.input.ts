import { Field, ID, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType('MarkTransactionCompletedInput')
export class MarkTransactionCompletedInput {
  @Field(() => ID)
  @IsUUID()
  conversationId: string;
}
