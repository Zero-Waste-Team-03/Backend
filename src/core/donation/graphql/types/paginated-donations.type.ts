import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../../common/graphql/types/pagination.type';
import { DonationType } from './donation.type';

@ObjectType('PaginatedDonations')
export class PaginatedDonations extends Paginated(DonationType) {}
