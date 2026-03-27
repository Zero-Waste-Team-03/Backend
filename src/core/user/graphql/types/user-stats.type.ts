import { Field, Int, Float, ObjectType } from '@nestjs/graphql';

@ObjectType('UserStats')
export class UserStatsResponse {
  @Field(() => Int, { description: 'Total number of users' })
  totalUsers: number;

  @Field(() => Float, {
    description: 'Percentage increase of total users since last month',
  })
  totalUsersIncrease: number;

  @Field(() => Int, { description: 'Number of active accounts' })
  activeAccounts: number;

  @Field(() => Float, {
    description: 'Percentage increase of active accounts since last month',
  })
  activeAccountsIncrease: number;

  @Field(() => Int, { description: 'Number of reported issues' })
  reportedIssues: number;

  @Field(() => Float, {
    description: 'Percentage increase of reported issues since last month',
  })
  reportedIssuesIncrease: number;
}
