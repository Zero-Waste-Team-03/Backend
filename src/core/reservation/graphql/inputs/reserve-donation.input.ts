
import { ArgsType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@ArgsType()
export class ReserveDonationInput {
  @Field(() => ID)
  @IsUUID()
  donationId: string;
}
