import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DonationType } from 'src/core/donation/graphql/types/donation.type';
import { UserType } from 'src/core/authentication/graphql/types/user.type';
import { ReservationStatus, ReservationStatusValues } from '../../entities/reservation.entity';

registerEnumType(ReservationStatusValues, {
  name: 'ReservationStatus',
  description: 'The possible statuses of a reservation',
});

@ObjectType('Reservation')
export class ReservationType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  donationId: string;

  @Field(() => DonationType, { nullable: true })
  donation?: DonationType;

  @Field(() => ID)
  beneficiaryId: string;

  @Field(() => UserType, { nullable: true })
  beneficiary?: UserType;

  @Field(() => ReservationStatusValues)
  status: ReservationStatus;

  @Field(() => Date, { nullable: true })
  confirmedAt?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
