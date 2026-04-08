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
import { DonationType } from './graphql/types/donation.type';
import { CreateDonationInput } from './graphql/inputs/create-donation.input';
import { UpdateDonationInput } from './graphql/inputs/update-donation.input';
import { DonationService } from './v1/donation.service';
import { MessageResponseType } from '../authentication/graphql/types/message-response.type';
import { DonationStatisticsType } from './graphql/types/donation-statistics.type';
import { DonationsMapInput } from './graphql/inputs/donations-map.input';
import { DonationMapMarkerType } from './graphql/types/donation-map-marker.type';
import { DonationsFilterInput } from './graphql/inputs/donations-filter.input';
import { UserType } from '../authentication/graphql/types/user.type';
import { IDataLoaders } from 'src/common/modules/dataloader/dataloader.interface';
import { User, UserRole } from '../user/entities/user.entity';
import { PaginatedDonations } from './graphql/types/paginated-donations.type';
import { PaginationInput } from '../../common/graphql/inputs/pagination.input';
import { LocationType } from '../authentication/graphql/types/location.type';
import { CategoryType } from '../category/graphql/types/category.type';
import { Location } from 'src/common/locations/entities/location.entity';
import { Category } from '../category/entities/category.entity';
import { AttachementType } from 'src/common/modules/attachment/graphql/attachement.type';

@Resolver(() => DonationType)
export class DonationResolver {
  constructor(private readonly donationService: DonationService) {}

  @Query(() => DonationStatisticsType, {
    description:
      'Get statistics for donations (total active, flagged, pending approvals)',
  })
  async donationStatistics(): Promise<DonationStatisticsType> {
    return this.donationService.getStatistics();
  }

  @Query(() => [DonationMapMarkerType], {
    description: 'Get donations within a radius from a center point for map visualization',
  })
  async donationsMap(
    @Args('input') input: DonationsMapInput,
  ): Promise<DonationMapMarkerType[]> {
    return this.donationService.getDonationsForMap(input);
  }

  @Query(() => PaginatedDonations, {
    description:
      'Get all donation listings with optional filters and donor access',
  })
  async donations(
    @USER('id') userId:string,
    @Args('filter', { nullable: true }) filter?: DonationsFilterInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<PaginatedDonations> {
    return this.donationService.findAll(userId,filter, pagination);
  }

  @ResolveField(() => UserType)
  async user(
    @Parent() donation: DonationType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<User | null> {
    return loaders.userLoader.load(donation.userId);
  }

  @ResolveField(() => LocationType, { nullable: true })
  async location(
    @Parent() donation: DonationType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<Location | null> {
    if (!donation.locationId) return null;
    return loaders.locationLoader.load(donation.locationId);
  }

  @ResolveField(() => CategoryType, { nullable: true })
  async category(
    @Parent() donation: DonationType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<Category | null> {
    if (!donation.categoryId) return null;
    return loaders.categoryLoader.load(donation.categoryId);
  }
  @ResolveField(()=>AttachementType,{nullable:false})
  async mainAttachment(
    @Parent() donation:DonationType,
    @Context() {loaders}: {loaders:IDataLoaders}
  ){
    if (!donation.mainAttachmentId) return null;
    return loaders.attachmentLoader.load(donation.mainAttachmentId);
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => DonationType, {
    description: 'Create a donation listing for the authenticated user',
  })
  async createDonation(
    @Args('input') input: CreateDonationInput,
    @USER('id') userId: string,
  ): Promise<DonationType> {
    return await this.donationService.createDonation(input, userId);
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => DonationType, {
    description:
      'Update a donation listing owned by the authenticated user using id and owner condition',
  })
  async updateDonation(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDonationInput,
    @USER('id') userId: string,
  ): Promise<DonationType> {
    return await this.donationService.updateDonation(id, input, userId);
  }
  @Query(() => DonationType, {
    description: 'Get a single donation listing by id',
  })
  async donation(@Args('id', { type: () => ID }) id: string): Promise<DonationType> {
    return await this.donationService.getDonationById(id);
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType, {
    description:
      'Delete a donation listing owned by the authenticated user using id and owner condition',
  })
  async deleteDonation(
    @Args('id', { type: () => ID }) id: string,
    @USER('id') userId: string,
    @USER('role') role:UserRole
  ): Promise<MessageResponseType> {
    return await this.donationService.deleteDonation(id, userId,role=="Administrator");
  }
}
