import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BadgeType } from './badge.type';

@ObjectType('Achievement')
export class AchievementType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  badgeId: string;

  @Field(() => Date)
  awardedAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => BadgeType, { nullable: true })
  badge?: BadgeType;
}
