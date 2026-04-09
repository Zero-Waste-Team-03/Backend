import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatMessage')
export class ChatMessageType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  conversationId: string;

  @Field(() => ID)
  senderId: string;

  @Field(() => String)
  content: string;

  @Field(() => Boolean)
  isModerated: boolean;

  @Field(() => Date)
  createdAt: Date;
}
