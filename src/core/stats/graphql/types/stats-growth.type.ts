import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('StatsGrowthPoint')
export class StatsGrowthPointType {
  @Field(() => String)
  period: string;

  @Field(() => Int)
  donationsCount: number;

  @Field(() => Int)
  usersCount: number;
}

@ObjectType('StatsGrowth')
export class StatsGrowthType {
  @Field(() => [StatsGrowthPointType])
  points: StatsGrowthPointType[];
}
