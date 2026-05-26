import { createUnionType } from '@nestjs/graphql';
import { DonationType } from '../../../donation/graphql/types/donation.type';
import { ChatMessageType } from '../../../chat/graphql/types/chat-message.type';
import { UserType } from '../../../authentication/graphql/types/user.type';

export const ReportedRecord = createUnionType({
  name: 'ReportedRecord',
  types: () => [DonationType, ChatMessageType, UserType] as const,
  resolveType(value) {
    if ('conversationId' in value) return ChatMessageType;
    if ('quantity' in value) return DonationType;
    return UserType;
  },
});
