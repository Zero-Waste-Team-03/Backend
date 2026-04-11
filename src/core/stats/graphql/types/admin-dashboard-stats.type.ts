import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AdminDashboardStats')
export class AdminDashboardStatsType {
  @Field(() => Int)
  totalDonations: number;

  @Field(() => Float)
  totalDonationsIncrease: number;

  @Field(() => Int)
  activeUsers: number;

  @Field(() => Float)
  activeUsersIncrease: number;

  @Field(() => Float)
  foodSavedKg: number;

  @Field(() => Float)
  foodSavedKgIncrease: number;

  @Field(() => Float)
  co2SavedKg: number;

  @Field(() => Float)
  co2SavedKgIncrease: number;
}
