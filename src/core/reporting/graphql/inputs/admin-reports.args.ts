import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import {
  ReportStatusValues,
  ReportTargetTypeValues,
} from '../../entities/report.entity';

@ArgsType()
export class AdminReportsArgs {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number = 10;

  @Field(() => ReportStatusValues, { nullable: true })
  @IsEnum(ReportStatusValues)
  @IsOptional()
  status?: (typeof ReportStatusValues)[keyof typeof ReportStatusValues];

  @Field(() => ReportTargetTypeValues, { nullable: true })
  @IsEnum(ReportTargetTypeValues)
  @IsOptional()
  targetType?: (typeof ReportTargetTypeValues)[keyof typeof ReportTargetTypeValues];

  @Field(() => String, { nullable: true })
  @IsUUID()
  @IsOptional()
  targetId?: string;
}
