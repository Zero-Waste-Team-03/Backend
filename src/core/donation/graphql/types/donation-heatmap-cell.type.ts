import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('DonationHeatmapCell')
export class DonationHeatmapCellType {
  @Field(() => Float)
  lat: number;

  @Field(() => Float)
  lng: number;

  @Field(() => Float)
  score: number;

  @Field(() => Float)
  rawScore: number;

  @Field(() => Int)
  donationCount: number;

  @Field(() => Int)
  completedCount: number;

  @Field(() => Int)
  activeCount: number;

  @Field(() => Int)
  userCount: number;

  @Field(() => Int)
  reservationCount: number;

  @Field(() => String, { nullable: true })
  topCategory?: string | null;

  @Field(() => String, { nullable: true })
  neighborhood?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;
}
