import { Resolver, Mutation, Args, ID, ResolveField, Parent, Context } from '@nestjs/graphql';
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

@Resolver(() => ReservationType)
export class ReservationResolver {
  constructor(private readonly reservationService: ReservationService) {}

  @UseGuards(AccessTokenGuard)
  @Mutation(() => ReservationType, {
    description: 'Create a new reservation for a donation'
  })
  async reserveDonation(
    @Args('donationId', { type: () => ID }) donationId: string,
    @USER('id') beneficiaryId: string,
  ): Promise<ReservationType> {
    return this.reservationService.reserveDonation(donationId, beneficiaryId) as any;
  }

  @UseGuards(AccessTokenGuard)
  @Mutation(() => ReservationType, {
    description: 'Confirm a pending reservation within the deadline'
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
    @Context() { loaders }: { loaders: IDataLoaders }
  ): Promise<Donation | null> {
    return loaders.donationLoader.load(reservation.donationId);
  }

  @ResolveField(() => UserType, { nullable: true })
  async beneficiary(
    @Parent() reservation: ReservationType,
    @Context() { loaders }: { loaders: IDataLoaders }
  ): Promise<User | null> {
    return loaders.userLoader.load(reservation.beneficiaryId);
  }
}
