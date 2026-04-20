import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { ReservationType } from '../reservation/graphql/types/reservation.type';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { USER } from '../authentication/decorators/user.decorartor';
import { ReservationCompletionService } from './reservation-completion.service';

@Resolver(() => ReservationType)
export class ReservationCompletionResolver {
  constructor(
    private readonly reservationCompletionService: ReservationCompletionService,
  ) {}

  @UseGuards(AccessTokenGuard)
  @Mutation(() => ReservationType, {
    description:
      'Confirm reservation completion by reservation id (both donor and beneficiary must confirm)',
  })
  async confirmReservationCompleted(
    @Args('reservationId', { type: () => ID }) reservationId: string,
    @USER('id') userId: string,
  ): Promise<ReservationType> {
    return this.reservationCompletionService.confirmReservationCompleted(
      reservationId,
      userId,
    ) as any;
  }
}
