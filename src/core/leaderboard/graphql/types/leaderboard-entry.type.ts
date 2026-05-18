import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class LeaderboardEntry {
  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  rank: number;
}
