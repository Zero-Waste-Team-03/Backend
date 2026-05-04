import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
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
import { ConversationPreviewType } from './graphql/types/conversation-preview.type';
import { ChatCounterpartPreviewType } from './graphql/types/chat-counterpart-preview.type';
import { IDataLoaders } from 'src/common/modules/dataloader/dataloader.interface';

@UseGuards(AccessTokenGuard)
@Resolver(() => ConversationPreviewType)
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

  @Query(() => [ConversationPreviewType], {
    description:
      'Get active conversations with minimal counterpart preview (name and image only)',
  })
  async myActiveConversations(
    @USER('id') userId: string,
  ): Promise<ConversationPreviewType[]> {
    return this.chatService.getMyActiveConversations(userId);
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

  @ResolveField(() => ChatCounterpartPreviewType)
  async counterpart(
    @Parent() conversation: ConversationPreviewType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<ChatCounterpartPreviewType> {
    const user = await loaders.userLoader.load(conversation.counterpartUserId);

    let avatarUrl: string | null = null;
    if (user?.avatarAttachmentId) {
      const attachment = await loaders.attachmentLoader.load(
        user.avatarAttachmentId,
      );
      avatarUrl = attachment?.url || null;
    }

    const baseName = user?.displayName || 'User';
    const title = conversation.donationTitle?.trim();
    const displayName = title ? `${baseName} (${title})` : baseName;

    return {
      displayName,
      avatarUrl,
    };
  }
}
