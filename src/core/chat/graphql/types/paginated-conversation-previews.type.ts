import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/graphql/types/pagination.type';
import { ConversationPreviewType } from './conversation-preview.type';

@ObjectType('PaginatedConversationPreviews')
export class PaginatedConversationPreviews extends Paginated(
  ConversationPreviewType,
) {}
