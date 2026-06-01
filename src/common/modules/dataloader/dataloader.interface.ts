import DataLoader from 'dataloader';
import { User } from '../../../core/user/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { Attachment } from '../attachment/entities/attachment.entity';
import { Category } from '../../../core/category/entities/category.entity';
import { Donation } from '../../../core/donation/entities/donation.entity';
import { Message } from '../../../core/chat/entities/message.entity';

/**
 * Interface for all DataLoaders available in GraphQL context
 *
 * Add new loaders here as you implement them for other entities
 */
export interface IDataLoaders {
  userLoader: DataLoader<string, User | null>;
  locationLoader: DataLoader<string, Location | null>;
  attachmentLoader: DataLoader<string, Attachment | null>;
  categoryLoader: DataLoader<string, Category | null>;
  donationLoader: DataLoader<string, Donation | null>;
  presenceLoader: DataLoader<string, boolean>;
  donationReservableLoader?: DataLoader<string, boolean>;
  donationDeletableLoader?: DataLoader<string, boolean>;
  messageLoader: DataLoader<string, Message | null>;
}
