import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';
import { ReportStatusValues } from '../../entities/report.entity';

@InputType()
export class ReviewReportInput {
  @Field(() => ID)
  @IsUUID()
  reportId: string;

  @Field(() => ReportStatusValues)
  @IsEnum(ReportStatusValues)
  status: (typeof ReportStatusValues)[keyof typeof ReportStatusValues];
}
