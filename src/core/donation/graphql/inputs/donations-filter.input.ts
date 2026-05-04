import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import {
  DonationUrgencyValues,
  DonationStatusValues,
  DonationUrgency,
  DonationStatus,
} from '../../entities/donation.entity';

 const DonationRoleFilter={
   DONOR:'DONOR',
  BENEFICIARY:'BENEFICIARY',
 } as const 

 export type DonationRoleFilter=typeof DonationRoleFilter[keyof typeof DonationRoleFilter];
registerEnumType(DonationRoleFilter)
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
