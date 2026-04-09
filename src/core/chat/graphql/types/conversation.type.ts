import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  ConversationStatus,
  ConversationStatusValues,
} from '../../entities/conversation.entity';

registerEnumType(ConversationStatusValues, {
  name: 'ConversationStatus',
  description: 'The lifecycle status of a conversation',
});

@ObjectType('Conversation')
export class ConversationType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  reservationId: string;

  @Field(() => String, { nullable: true })
  lastMessage?: string | null;

  @Field(() => ConversationStatusValues)
  status: ConversationStatus;

  @Field(() => Date)
  createdAt: Date;
}
