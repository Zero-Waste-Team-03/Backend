import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('ReportStatsPoint')
export class ReportStatsPointType {
  @Field(() => String)
  period: string;

  @Field(() => Int)
  reportsCount: number;
}

@ObjectType('ReportStats')
export class ReportStatsType {
  @Field(() => Int)
  totalReports: number;

  @Field(() => Float)
  totalReportsIncrease: number;

  @Field(() => Int)
  openReports: number;

  @Field(() => Float)
  openReportsIncrease: number;

  @Field(() => [ReportStatsPointType])
  chart: ReportStatsPointType[];
}
