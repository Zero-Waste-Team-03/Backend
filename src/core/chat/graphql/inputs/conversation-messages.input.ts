import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';

@InputType('ConversationMessagesInput')
export class ConversationMessagesInput {
  @Field(() => ID)
  @IsUUID()
  conversationId: string;

  @Field(() => PaginationInput, { nullable: true })
  @IsOptional()
  pagination?: PaginationInput;
}
