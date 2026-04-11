import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/graphql/types/pagination.type';
import { ReservationType } from './reservation.type';

@ObjectType('PaginatedReservations')
export class PaginatedReservations extends Paginated(ReservationType) {}
