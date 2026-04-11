import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ReportTargetTypeValues } from '../../entities/report.entity';

@InputType()
export class CreateReportInput {
  @Field(() => ReportTargetTypeValues)
  @IsEnum(ReportTargetTypeValues)
  targetType: (typeof ReportTargetTypeValues)[keyof typeof ReportTargetTypeValues];

  @Field(() => String)
  @IsUUID()
  targetId: string;

  @Field(() => String)
  @IsString()
  @MaxLength(120)
  reason: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
