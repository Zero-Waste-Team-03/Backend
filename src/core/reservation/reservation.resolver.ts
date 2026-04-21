import {
  Resolver,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
  Context,
  Query,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationType } from 'src/core/reservation/graphql/types/reservation.type';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { USER } from '../authentication/decorators/user.decorartor';
import { DonationType } from '../donation/graphql/types/donation.type';
import { UserType } from '../authentication/graphql/types/user.type';
import { IDataLoaders } from 'src/common/modules/dataloader/dataloader.interface';
import { Donation } from '../donation/entities/donation.entity';
import { User } from '../user/entities/user.entity';
import { PaginatedReservations } from './graphql/types/paginated-reservations.type';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';
import { ReservationsFilterInput } from './graphql/inputs/reservations-filter.input';
import { ReserveDonationInput } from './graphql/inputs/reserve-donation.input';

@Resolver(() => ReservationType)
export class ReservationResolver {
  constructor(private readonly reservationService: ReservationService) {}

  @UseGuards(AccessTokenGuard)
  @Query(() => PaginatedReservations, {
    description:
      'Get reservations where the current user is donor or beneficiary',
  })
  async myReservations(
    @USER('id') userId: string,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @Args('filter', { nullable: true }) filter?: ReservationsFilterInput,
  ): Promise<PaginatedReservations> {
    return this.reservationService.findMyReservations(
      userId,
      filter,
      pagination,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Query(() => ReservationType, {
    description:
      'Get a single reservation by ID if current user is donor or beneficiary',
  })
  async myReservation(
    @Args('id', { type: () => ID }) id: string,
    @USER('id') userId: string,
  ): Promise<ReservationType> {
    return this.reservationService.findMyReservationById(id, userId) as any;
  }

  @UseGuards(AccessTokenGuard)
  @Query(() => PaginatedReservations, {
    description:
      'Get all reservations for a donation if current user is donation owner',
  })
  async donationReservations(
    @Args('donationId', { type: () => ID }) donationId: string,
    @USER('id') userId: string,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<PaginatedReservations> {
    return this.reservationService.findDonationReservations(
      donationId,
      userId,
      pagination,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => ReservationType, {
    description: 'Create a new reservation for a donation',
  })
  async reserveDonation(
    @Args() input: ReserveDonationInput,
    @USER('id') beneficiaryId: string,
  ): Promise<ReservationType> {

    return this.reservationService.reserveDonation(
      input.donationId,
      beneficiaryId,
      input.quantity ?? 1,
    ) as any;
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => ReservationType, {
    description:
      'Confirm reservation (deprecated: reservations are auto-confirmed)',
    deprecationReason: 'Reservations are confirmed automatically on creation.',
  })
  async confirmReservation(
    @Args('id', { type: () => ID }) id: string,
    @USER('id') beneficiaryId: string,
  ): Promise<ReservationType> {
    return this.reservationService.confirmReservation(id, beneficiaryId) as any;
  }

  @ResolveField(() => DonationType, { nullable: true })
  async donation(
    @Parent() reservation: ReservationType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<Donation | null> {
    return loaders.donationLoader.load(reservation.donationId);
  }

  @ResolveField(() => UserType, { nullable: true })
  async beneficiary(
    @Parent() reservation: ReservationType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<User | null> {
    return loaders.userLoader.load(reservation.beneficiaryId);
  }
}
