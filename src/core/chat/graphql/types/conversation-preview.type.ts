import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  ConversationStatus,
  ConversationStatusValues,
} from '../../entities/conversation.entity';
import { ChatCounterpartPreviewType } from './chat-counterpart-preview.type';

@ObjectType('ConversationPreview')
export class ConversationPreviewType {
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

  @Field(() => ChatCounterpartPreviewType)
  counterpart: ChatCounterpartPreviewType;

  counterpartUserId: string;

  donationTitle?: string | null;
}
