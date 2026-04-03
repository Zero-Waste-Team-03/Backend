import { Field, InputType, Int } from '@nestjs/graphql';
import {
  ArrayUnique,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  DONATION_STATUS_OPTIONS,
  DONATION_URGENCY_OPTIONS,
} from '../../entities/donation.entity';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Type } from 'class-transformer';

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

  @Field(() => String, {
    nullable: true,
    description: 'Donation lifecycle status',
  })
  @IsOptional()
  @IsString()
  @IsIn(DONATION_STATUS_OPTIONS)
  status?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Urgency level for the listing',
  })
  @IsOptional()
  @IsString()
  @IsIn(DONATION_URGENCY_OPTIONS)
  urgency?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether safety checklist was completed',
  })
  @IsOptional()
  @IsBoolean()
  safetyChecklistCompleted?: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Optional pickup location id',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

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
    description: 'Attachment ids returned by upload endpoint',
  })
  @IsOptional()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  attachmentIds?: string[];

  @Field(() => String, {
    nullable: true,
    description: 'Main attachment id; must be inside attachmentIds',
  })
  @IsOptional()
  @IsUUID()
  mainAttachmentId?: string;
}
