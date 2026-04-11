import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class AdminDashboardStatsInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'When true, donation metrics are limited to Published, Reserved, and Completed statuses',
  })
  @IsOptional()
  @IsBoolean()
  applyDonationStatusFilter?: boolean;
}
