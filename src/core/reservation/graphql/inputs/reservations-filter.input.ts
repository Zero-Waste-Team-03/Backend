import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import {
  ReservationStatus,
  ReservationStatusValues,
} from '../../entities/reservation.entity';
const DonationRoleFilter={
   DONOR:'DONOR',
  BENEFICIARY:'BENEFICIARY',
 } as const 

 export type DonationRoleFilter=typeof DonationRoleFilter[keyof typeof DonationRoleFilter];
registerEnumType(DonationRoleFilter)

@InputType('ReservationsFilterInput')
export class ReservationsFilterInput {
  @Field(() => ReservationStatusValues, { nullable: true })
  @IsOptional()
  @IsEnum(ReservationStatusValues)
  status?: ReservationStatus;
@Field(()=>DonationRoleFilter,{nullable:true})
  @IsOptional()
  roleFilter?: DonationRoleFilter;
}
