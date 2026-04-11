import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export const StatsGrowthPeriodValues = {
  LAST_WEEK: 'last_week',
  LAST_MONTH: 'last_month',
  LAST_YEAR: 'last_year',
} as const;

export type StatsGrowthPeriod =
  (typeof StatsGrowthPeriodValues)[keyof typeof StatsGrowthPeriodValues];

registerEnumType(StatsGrowthPeriodValues, {
  name: 'StatsGrowthPeriod',
  description: 'Time period for growth charts',
});

@InputType()
export class StatsGrowthInput {
  @Field(() => StatsGrowthPeriodValues)
  @IsEnum(StatsGrowthPeriodValues)
  period: StatsGrowthPeriod;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'When true, donation growth counts only Published, Reserved, and Completed statuses',
  })
  @IsOptional()
  @IsBoolean()
  applyDonationStatusFilter?: boolean;
}
