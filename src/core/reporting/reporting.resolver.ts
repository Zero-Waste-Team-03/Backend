import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { USER } from '../authentication/decorators/user.decorartor';
import { Roles } from '../authentication/decorators/roles.decorator';
import { User, UserRoleValues } from '../user/entities/user.entity';
import { ReportingService } from './reporting.service';
import { CreateReportInput } from './graphql/inputs/create-report.input';
import { ReportType } from './graphql/types/report.type';
import { AdminReportsArgs } from './graphql/inputs/admin-reports.args';
import { PaginatedReports } from './graphql/types/paginated-reports.type';
import { ReviewReportInput } from './graphql/inputs/review-report.input';
import { DangerousDonationsArgs } from './graphql/inputs/dangerous-donations.args';
import { PaginatedDangerousDonations } from './graphql/types/paginated-dangerous-donations.type';
import { ReportStatsInput } from './graphql/inputs/report-stats.input';
import { ReportStatsType } from './graphql/types/report-stats.type';
import { UserType } from '../authentication/graphql/types/user.type';
import { IDataLoaders } from 'src/common/modules/dataloader/dataloader.interface';
import { ReportedRecord } from './graphql/types/reported-record.union';
import { ReportTargetTypeValues } from './entities/report.entity';
import { Donation } from '../donation/entities/donation.entity';
import { Message } from '../chat/entities/message.entity';

@UseGuards(AccessTokenGuard)
@Resolver(() => ReportType)
export class ReportingResolver {
  constructor(private readonly reportingService: ReportingService) {}

  @Mutation(() => ReportType, {
    description: 'Create a report for a user, message, or donation',
  })
  async createReport(
    @Args('input') input: CreateReportInput,
    @USER('id') reporterId: string,
  ): Promise<ReportType> {
    return this.reportingService.createReport(input, reporterId);
  }

  @Query(() => [ReportType], {
    description: 'Get reports created by current user',
  })
  async myReports(@USER('id') reporterId: string): Promise<ReportType[]> {
    return this.reportingService.getMyReports(reporterId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Query(() => PaginatedReports, {
    description: 'Admin: list reports with filters',
  })
  async adminReports(
    @Args() args: AdminReportsArgs,
  ): Promise<PaginatedReports> {
    return this.reportingService.adminGetReports(args);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => ReportType, {
    description: 'Admin: review or resolve report',
  })
  async adminReviewReport(
    @Args('input') input: ReviewReportInput,
    @USER('id') reviewerId: string,
  ): Promise<ReportType> {
    return this.reportingService.reviewReport(
      input.reportId,
      input.status,
      reviewerId,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Query(() => PaginatedDangerousDonations, {
    description: 'Admin: list dangerous donations ranked by risk score',
  })
  async adminDangerousDonations(
    @Args() args: DangerousDonationsArgs,
  ): Promise<PaginatedDangerousDonations> {
    return this.reportingService.getDangerousDonations(args.page, args.limit);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Query(() => ReportStatsType, {
    description:
      'Admin: get total/open reports and report growth chart for selected period and status filter',
  })
  async adminReportStats(
    @Args('input') input: ReportStatsInput,
  ): Promise<ReportStatsType> {
    return this.reportingService.getReportStats(input);
  }
  @ResolveField(() => UserType, { nullable: true })
  async reporter(
    @Parent() report: ReportType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<User | null> {
    if (!report.reporterId) return null;
    return loaders.userLoader.load(report.reporterId);
  }

  @ResolveField(() => ReportedRecord, { nullable: true })
  async reportedRecord(
    @Parent() report: ReportType,
    @Context() { loaders }: { loaders: IDataLoaders },
  ): Promise<Donation | Message | User | null> {
    if (report.targetType === ReportTargetTypeValues.DONATION) {
      return loaders.donationLoader.load(report.targetId);
    }
    if (report.targetType === ReportTargetTypeValues.MESSAGE) {
      return loaders.messageLoader.load(report.targetId);
    }
    return loaders.userLoader.load(report.targetId);
  }
}
