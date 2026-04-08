import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { DonationUrgency, DonationUrgencyValues } from '../../entities/donation.entity';

export const MarkerColorValues = {
  RED: 'Red',
  ORANGE: 'Orange',
  GREEN: 'Green',
} as const;

export type MarkerColor = (typeof MarkerColorValues)[keyof typeof MarkerColorValues];

registerEnumType(MarkerColorValues, {
  name: 'MarkerColorValues',
  description: 'Color of the map marker',
});

@ObjectType('DonationMapMarker')
export class DonationMapMarkerType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => MarkerColorValues)
  @IsEnum(MarkerColorValues)
  markerColor: MarkerColor;

  @Field(() => DonationUrgencyValues)
  @IsEnum(DonationUrgencyValues)
  urgency: DonationUrgency;

  @Field(() => String)
  categoryId: string;

  @Field(() => String, { description: 'Main attachment id reference' })
  mainAttachmentId: string;
}
