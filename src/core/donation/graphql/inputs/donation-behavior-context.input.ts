import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import {
  SEARCH_DISTANCE_BUCKETS,
  SEARCH_VIEW_ORIGINS,
  SearchDistanceBucket,
  SearchViewOrigin,
} from 'src/common/constants/redis-pubsub';

@InputType('DonationBehaviorContextInput')
export class DonationBehaviorContextInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(SEARCH_DISTANCE_BUCKETS)
  distanceBucket?: SearchDistanceBucket;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(SEARCH_VIEW_ORIGINS)
  origin?: SearchViewOrigin;
}
