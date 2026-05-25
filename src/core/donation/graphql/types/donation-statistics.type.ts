import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('DonationStatistics')
export class DonationStatisticsType {
  @Field(() => Int, {
    description: 'Total number of active (published) donations',
  })
  totalActiveDonations: number;

  @Field(() => Int, { description: 'Total number of flagged donations' })
  flaggedItems: number;

  @Field(() => Int, {
    description: 'Total number of donations pending approval',
  })
  pendingApprovals: number;
}
