import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import {
  DonationUrgencyValues,
  DonationStatusValues,
  DonationUrgency,
  DonationStatus,
} from '../../entities/donation.entity';
import {
  SEARCH_DISTANCE_BUCKETS,
  SEARCH_VIEW_ORIGINS,
  SearchDistanceBucket,
  SearchViewOrigin,
} from 'src/common/constants/redis-pubsub';

@InputType('DonationsFilterInput')
export class DonationsFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Field(() => DonationUrgencyValues, { nullable: true })
  @IsOptional()
  @IsEnum(DonationUrgencyValues)
  urgency?: DonationUrgency;

  @Field(() => DonationStatusValues, { nullable: true })
  @IsOptional()
  @IsEnum(DonationStatusValues)
  status?: DonationStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(SEARCH_DISTANCE_BUCKETS)
  distanceBucket?: SearchDistanceBucket;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(SEARCH_VIEW_ORIGINS)
  origin?: SearchViewOrigin;
}
