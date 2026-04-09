import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ChatMessageType } from './chat-message.type';

@ObjectType('PaginatedMessages')
export class PaginatedMessages {
  @Field(() => [ChatMessageType])
  items: ChatMessageType[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;
}
