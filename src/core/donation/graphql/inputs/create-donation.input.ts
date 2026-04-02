import { Field, InputType } from '@nestjs/graphql';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { DONATION_STATUS_OPTIONS } from '../../entities/donation.entity';
import { GraphQLJSON } from 'graphql-type-json';
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

  @Field(() => Number, {
    description: 'Available quantity in integer units',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @Field(() => GraphQLJSON, {
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
    description: 'Attachment id returned by upload endpoint',
  })
  @IsOptional()
  @IsUUID()
  attachmentId?: string;
}
