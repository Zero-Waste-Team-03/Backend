import { Field, InputType} from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import {
  DonationUrgencyValues,
  DonationStatusValues,
  DonationUrgency,
  DonationStatus,
} from '../../entities/donation.entity';

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
  }
