import { ArgsType, Field, ID, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

@ArgsType()
export class ReserveDonationInput {
  @Field(() => ID)
  donationId: string;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 1,
    description: 'Number of units to reserve (defaults to 1)',
  })
  @IsInt()
  @Min(1)
  quantity?: number;
}
