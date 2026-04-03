import { Field, InputType, Int } from '@nestjs/graphql';
import {
  ArrayUnique,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
  IsString,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import {
  DonationUrgency,
  DonationUrgencyValues,
} from '../../entities/donation.entity';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Type } from 'class-transformer';
import { LocationInput } from 'src/common/locations/graphql/inputs/location.input';

@InputType()
export class CreateDonationInput {
  @Field(() => String, { description: 'Category id for this donation listing' })
  @IsUUID()
  categoryId: string;

  @Field(() => String, { description: 'Donation title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field(() => String, { description: 'Detailed donation description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => Int, {
    description: 'Available quantity in integer units',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Structured specification payload (e.g. packaging, allergens)',
  })
  @IsOptional()
  @IsObject()
  specification?: Record<string, any>;

  @Field(() => Date, {
    description: 'Expiry date/time for this donation',
  })
  @Type(() => Date)
  @IsDate()
  expiryDate: Date;

  @Field(() => DonationUrgencyValues, {
    nullable: true,
    description: 'Urgency level for the listing',
  })
  urgency?: DonationUrgency;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether safety checklist was completed',
  })
  @IsOptional()
  @IsBoolean()
  safetyChecklistCompleted?: boolean;

  @Field(() => String, {
    nullable: true,
    description:
      'Optional pickup location id. On update, explicit null clears location.',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @Field(() => LocationInput, {
    nullable: true,
    description:
      'Optional pickup location payload. Provide either locationId or locationInput, not both.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationInput)
  locationInput?: LocationInput;

  @Field(() => Date, {
    nullable: true,
    description: 'Optional listing expiration date/time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  listingExpiresAt?: Date;

  @Field(() => [String], {
    nullable: true,
    description:
      'Optional additional attachment ids returned by upload endpoint',
  })
  @IsOptional()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  attachmentIds?: string[];

  @Field(() => String, {
    description: 'Main attachment id used as cover photo',
  })
  @IsUUID()
  mainAttachmentId: string;
}
