import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { USER } from '../authentication/decorators/user.decorartor';
import { ChatService } from './chat.service';
import { ConversationType } from './graphql/types/conversation.type';
import { ConversationMessagesInput } from './graphql/inputs/conversation-messages.input';
import { PaginatedMessages } from './graphql/types/paginated-messages.type';
import { SendMessageInput } from './graphql/inputs/send-message.input';
import { ChatMessageType } from './graphql/types/chat-message.type';
import { ApproveSensitiveMessageInput } from './graphql/inputs/approve-sensitive-message.input';
import { ChatConversationMemberGuard } from './guards/chat-conversation-member.guard';
import { ChatConversationWritableGuard } from './guards/chat-conversation-writable.guard';
import { MarkTransactionCompletedInput } from './graphql/inputs/mark-transaction-completed.input';

@UseGuards(AccessTokenGuard)
@Resolver(() => ConversationType)
export class ChatResolver {
  constructor(private readonly chatService: ChatService) {}

  @Mutation(() => ConversationType, {
    description: 'Create or get conversation by reservation id',
  })
  async getOrCreateConversation(
    @Args('reservationId', { type: () => ID }) reservationId: string,
    @USER('id') userId: string,
  ): Promise<ConversationType> {
    return this.chatService.getOrCreateConversation(reservationId, userId);
  }

  @Query(() => PaginatedMessages, {
    description: 'Get paginated messages of a conversation',
  })
  async conversationMessages(
    @Args('input') input: ConversationMessagesInput,
    @USER('id') userId: string,
  ): Promise<PaginatedMessages> {
    return this.chatService.getMessages(
      input.conversationId,
      userId,
      input.pagination,
    );
  }

  @Mutation(() => ChatMessageType, {
    description: 'Send message in an existing conversation',
  })
  @UseGuards(ChatConversationMemberGuard, ChatConversationWritableGuard)
  async sendMessage(
    @Args('input') input: SendMessageInput,
    @USER('id') userId: string,
  ): Promise<ChatMessageType> {
    return this.chatService.sendMessage({
      conversationId: input.conversationId,
      senderId: userId,
      content: input.content,
    });
  }

  @Mutation(() => ChatMessageType, {
    description: 'Approve a sensitive message to reveal it to the approver',
  })
  @UseGuards(ChatConversationMemberGuard)
  async approveSensitiveMessage(
    @Args('input') input: ApproveSensitiveMessageInput,
    @USER('id') userId: string,
  ): Promise<ChatMessageType> {
    return this.chatService.approveSensitiveMessage({
      conversationId: input.conversationId,
      messageId: input.messageId,
      approverId: userId,
    });
  }

  @Mutation(() => ConversationType, {
    description: 'Mark transaction as completed from chat context',
  })
  @UseGuards(ChatConversationMemberGuard)
  async markTransactionCompleted(
    @Args('input') input: MarkTransactionCompletedInput,
    @USER('id') userId: string,
  ): Promise<ConversationType> {
    return this.chatService.markTransactionCompleted({
      conversationId: input.conversationId,
      userId,
    });
  }
}
