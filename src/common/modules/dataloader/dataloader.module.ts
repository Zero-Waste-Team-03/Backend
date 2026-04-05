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
    TypeOrmModule.forFeature([Location, Attachment]),
  ],
  providers: [
    UserDataLoader,
    LocationDataLoader,
    AttachmentDataLoader,
    CategoryDataLoader,
  ],
  exports: [
    UserDataLoader,
    LocationDataLoader,
    AttachmentDataLoader,
    CategoryDataLoader,
  ],
})
export class DataLoaderModule {}
