import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/graphql/types/pagination.type';
import { DangerousDonationType } from './dangerous-donation.type';

@ObjectType('PaginatedDangerousDonations')
export class PaginatedDangerousDonations extends Paginated(
  DangerousDonationType,
) {}
