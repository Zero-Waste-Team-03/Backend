import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserType } from '../../../authentication/graphql/types/user.type';
import { Paginated } from 'src/common/graphql/types/pagination.type';
import {
  VerificationRequestStatus,
  VerificationRequestStatusValues,
} from '../../verification-request.entity';

registerEnumType(VerificationRequestStatusValues, {
  name: 'VerificationRequestStatus',
  description: 'Status of a verification request',
});

@ObjectType('VerificationRequest')
export class VerificationRequestType {
  @Field(() => String, { description: 'Unique identifier' })
  id: string;

  @Field(() => String, { description: 'Requester ID' })
  requesterId: string;

  @Field(() => UserType, {
    description: 'User who requested verification',
    nullable: true,
  })
  requester?: UserType;

  @Field(() => String, { description: 'Target food saver ID' })
  targetFoodSaverId: string;

  @Field(() => UserType, {
    description: 'Food saver being requested',
    nullable: true,
  })
  targetFoodSaver?: UserType;

  @Field(() => VerificationRequestStatusValues, {
    description: 'Status of the request',
  })
  status: VerificationRequestStatus;

  @Field(() => Date, { description: 'Creation date' })
  createdAt: Date;

  @Field(() => Date, { description: 'Update date' })
  updatedAt: Date;
}

@ObjectType('PaginatedVerificationRequests')
export class PaginatedVerificationRequests extends Paginated(
  VerificationRequestType,
) {}
