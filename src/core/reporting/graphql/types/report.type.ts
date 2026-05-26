import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  ReportStatus,
  ReportStatusValues,
  ReportTargetType,
  ReportTargetTypeValues,
} from '../../entities/report.entity';
import { ReportedRecord } from './reported-record.union';

registerEnumType(ReportTargetTypeValues, {
  name: 'ReportTargetType',
  description: 'The type of entity being reported',
});

registerEnumType(ReportStatusValues, {
  name: 'ReportStatus',
  description: 'Moderation status of the report',
});

@ObjectType('Report')
export class ReportType {
  @Field(() => ID)
  id: string;

  @Field(() => ReportTargetTypeValues)
  targetType: ReportTargetType;

  @Field(() => ID)
  targetId: string;

  @Field(() => ID)
  reporterId: string;

  @Field(() => String)
  reason: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ReportStatusValues)
  status: ReportStatus;

  @Field(() => ID, { nullable: true })
  reviewedById?: string | null;

  @Field(() => Date, { nullable: true })
  reviewedAt?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => ReportedRecord, { nullable: true })
  reportedRecord?: unknown;
}
