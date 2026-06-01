import { Module } from '@nestjs/common';
import { UserDataLoader } from './user.dataloader';
import { LocationDataLoader } from './location.dataloader';
import { AttachmentDataLoader } from './attachment.dataloader';
import { UserModule } from '../../../core/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from '../../locations/entities/location.entity';
import { Attachment } from '../attachment/entities/attachment.entity';
import { CategoryDataLoader } from './category.dataloader';
import { CategoryModule } from '../../../core/category/category.module';
import { DonationDataLoader } from './donation.dataloader';
import { DonationModule } from '../../../core/donation/donation.module';
import { PresenceDataLoader } from './presence.dataloader';
import { PresenceModule } from '../../../core/presence/presence.module';
import { DonationReservableDataLoader } from './donation-reservable.dataloader';
import { ReservationModule } from '../../../core/reservation/reservation.module';
import { MessageDataLoader } from './message.dataloader';
import { Message } from '../../../core/chat/entities/message.entity';
import { DonationDeletableDataLoader } from './donation-deletable.dataloader';

/**
 * DataLoader Module
 *
 * Provides DataLoader services for batching and caching database queries
 * to solve N+1 query problems in GraphQL resolvers.
 *
 * Note: DataLoader instances are created per-request in the GraphQL context,
 * not as singleton services. This module only provides the factory services.
 */
@Module({
  imports: [
    UserModule,
    CategoryModule,
    DonationModule,
    PresenceModule,
    ReservationModule,
    TypeOrmModule.forFeature([Location, Attachment, Message]),
  ],
  providers: [
    UserDataLoader,
    LocationDataLoader,
    AttachmentDataLoader,
    CategoryDataLoader,
    DonationDataLoader,
    PresenceDataLoader,
    DonationReservableDataLoader,
    DonationDeletableDataLoader,
    MessageDataLoader,
  ],
  exports: [
    UserDataLoader,
    LocationDataLoader,
    AttachmentDataLoader,
    CategoryDataLoader,
    DonationDataLoader,
    PresenceDataLoader,
    DonationReservableDataLoader,
    DonationDeletableDataLoader,
    MessageDataLoader,
  ],
})
export class DataLoaderModule {}
