import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/graphql/types/pagination.type';
import { ReportType } from './report.type';

@ObjectType('PaginatedReports')
export class PaginatedReports extends Paginated(ReportType) {}
