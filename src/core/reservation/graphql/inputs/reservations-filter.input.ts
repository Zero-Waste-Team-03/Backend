import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import {
  ReservationStatus,
  ReservationStatusValues,
} from '../../entities/reservation.entity';

@InputType('ReservationsFilterInput')
export class ReservationsFilterInput {
  @Field(() => ReservationStatusValues, { nullable: true })
  @IsOptional()
  @IsEnum(ReservationStatusValues)
  status?: ReservationStatus;
}
