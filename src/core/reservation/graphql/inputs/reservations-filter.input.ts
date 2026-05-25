import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import {
  ReservationStatus,
  ReservationStatusValues,
} from '../../entities/reservation.entity';
const ReservationRoleFilter = {
  DONOR: 'DONOR',
  BENEFICIARY: 'BENEFICIARY',
} as const;

export type ReservationRoleFilter =
  (typeof ReservationRoleFilter)[keyof typeof ReservationRoleFilter];
registerEnumType(ReservationRoleFilter, { name: 'ReservationRoleFilter' });

@InputType('ReservationsFilterInput')
export class ReservationsFilterInput {
  @Field(() => ReservationStatusValues, { nullable: true })
  @IsOptional()
  @IsEnum(ReservationStatusValues)
  status?: ReservationStatus;
  @Field(() => ReservationRoleFilter, { nullable: true })
  @IsOptional()
  roleFilter?: ReservationRoleFilter;
}
