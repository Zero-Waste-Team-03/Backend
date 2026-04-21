import { ArgsType, Field, ID, Int } from '@nestjs/graphql';

@ArgsType()
export class ReserveDonationInput {
  @Field(() => ID)
  donationId: string;
}
