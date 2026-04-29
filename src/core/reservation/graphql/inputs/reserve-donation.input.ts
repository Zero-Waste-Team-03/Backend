
import { ArgsType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID, Min } from 'class-validator';

@ArgsType()
export class ReserveDonationInput {
  @Field(() => ID)
  @IsUUID()
  donationId: string;
  @Field(()=>Int,{nullable:true,defaultValue:1})
  @Min(1)
  quantity?:number;
}
