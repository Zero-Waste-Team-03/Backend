import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType('UsersDonationsStats')
export class UsersDonationsStats{
  @Field(() => Number)
  totalDonations: number;
  @Field(() => Number)
  likedDonations: number;
}
