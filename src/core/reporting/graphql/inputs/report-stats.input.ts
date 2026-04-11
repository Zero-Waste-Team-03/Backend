import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

export const ReportStatsPeriodValues = {
  LAST_WEEK: 'last_week',
  LAST_MONTH: 'last_month',
  LAST_YEAR: 'last_year',
} as const;

export type ReportStatsPeriod =
  (typeof ReportStatsPeriodValues)[keyof typeof ReportStatsPeriodValues];

export const ReportStatsStatusFilterValues = {
  ALL: 'all',
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
} as const;

export type ReportStatsStatusFilter =
  (typeof ReportStatsStatusFilterValues)[keyof typeof ReportStatsStatusFilterValues];

registerEnumType(ReportStatsPeriodValues, {
  name: 'ReportStatsPeriod',
  description: 'Time period for reporting chart',
});

registerEnumType(ReportStatsStatusFilterValues, {
  name: 'ReportStatsStatusFilter',
  description:
    'Status filter for reports chart (accepted is treated as resolved)',
});

@InputType()
export class ReportStatsInput {
  @Field(() => ReportStatsPeriodValues)
  @IsEnum(ReportStatsPeriodValues)
  period: ReportStatsPeriod;

  @Field(() => ReportStatsStatusFilterValues, {
    nullable: true,
    defaultValue: ReportStatsStatusFilterValues.ALL,
  })
  @IsOptional()
  @IsEnum(ReportStatsStatusFilterValues)
  statusFilter?: ReportStatsStatusFilter;
}
