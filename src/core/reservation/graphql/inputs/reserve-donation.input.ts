import { ArgsType, Field, ID} from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@ArgsType()
export class ReserveDonationInput {
  @Field(() => ID)
  @IsUUID()
  donationId: string;
}
