import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Report,
  ReportStatus,
  ReportStatusValues,
  ReportTargetType,
  ReportTargetTypeValues,
} from './entities/report.entity';
import { CreateReportInput } from './graphql/inputs/create-report.input';
import { AdminReportsArgs } from './graphql/inputs/admin-reports.args';
import { throwAppError } from 'src/common/errors';
import { Donation } from '../donation/entities/donation.entity';
import { Message } from '../chat/entities/message.entity';
import { User } from '../user/entities/user.entity';
import {
  CategorySensitivity,
  CategorySensitivityValues,
} from '../category/entities/category.entity';
import {
  ReportStatsInput,
  ReportStatsPeriodValues,
  ReportStatsStatusFilterValues,
} from './graphql/inputs/report-stats.input';
import { ReportStatsType } from './graphql/types/report-stats.type';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPE } from '../notifications/enums/notification-type.enum';
import { UserRoleValues } from '../user/entities/user.entity';

type DangerousDonationRow = {
  donationId: string;
  title: string;
  categoryId: string;
  categoryName: string;
  categorySensitivity: CategorySensitivity;
  safetyChecklistCompleted: boolean;
  reportCount: string;
  lastReportedAt: Date | null;
};

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createReport(
    input: CreateReportInput,
    reporterId: string,
  ): Promise<Report> {
    await this.ensureTargetExists(input.targetType, input.targetId);

    const duplicate = await this.reportRepository.findOne({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: ReportStatusValues.OPEN,
      },
    });

    if (duplicate) {
      throwAppError('REPORT_DUPLICATE_OPEN', {
        targetType: input.targetType,
        targetId: input.targetId,
      });
    }

    const report = this.reportRepository.create({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason.trim(),
      description: input.description?.trim() || null,
      status: ReportStatusValues.OPEN,
    });

    const savedReport = await this.reportRepository.save(report);

    const adminUsers = await this.userRepository.find({
      where: { role: UserRoleValues.ADMINISTRATOR },
      select: ['id'],
    });

    await Promise.allSettled(
      adminUsers.map((adminUser) =>
        this.notificationsService.sendNotification(
          'New report submitted',
          'A new report was submitted and needs moderation review.',
          adminUser.id,
          NOTIFICATION_TYPE.REPORT_ALERT,
          {
            reportId: savedReport.id,
            targetType: savedReport.targetType,
            targetId: savedReport.targetId,
            reason: savedReport.reason,
          },
        ),
      ),
    );

    return savedReport;
  }

  async getMyReports(reporterId: string): Promise<Report[]> {
    return this.reportRepository.find({
      where: { reporterId },
      order: { createdAt: 'DESC' },
    });
  }

  async adminGetReports(args: AdminReportsArgs) {
    const { page, limit, status, targetType, targetId } = args;
    const skip = (page - 1) * limit;

    const qb = this.reportRepository.createQueryBuilder('report');

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    if (targetType) {
      qb.andWhere('report.targetType = :targetType', { targetType });
    }

    if (targetId) {
      qb.andWhere('report.targetId = :targetId', { targetId });
    }

    const [items, totalCount] = await qb
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async reviewReport(
    reportId: string,
    status: ReportStatus,
    reviewerId: string,
  ): Promise<Report> {
    if (status === ReportStatusValues.OPEN) {
      throwAppError('REPORT_STATUS_INVALID', { status });
    }

    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throwAppError('REPORT_NOT_FOUND', { id: reportId });
    }

    report.status = status;
    report.reviewedById = reviewerId;
    report.reviewedAt = new Date();

    const savedReport = await this.reportRepository.save(report);

    await this.notificationsService.sendNotification(
      'Report reviewed',
      'Your report has been reviewed by our moderation team.',
      report.reporterId,
      NOTIFICATION_TYPE.REPORT_ALERT,
      {
        reportId: savedReport.id,
        status: savedReport.status,
        targetType: savedReport.targetType,
        targetId: savedReport.targetId,
      },
    );

    return savedReport;
  }

  async getReportCountsForMonth(startInclusive: Date, endExclusive: Date) {
    const [totalReports, openReports] = await Promise.all([
      this.reportRepository
        .createQueryBuilder('report')
        .where('report.createdAt >= :startInclusive', { startInclusive })
        .andWhere('report.createdAt < :endExclusive', { endExclusive })
        .getCount(),
      this.reportRepository
        .createQueryBuilder('report')
        .where('report.createdAt >= :startInclusive', { startInclusive })
        .andWhere('report.createdAt < :endExclusive', { endExclusive })
        .andWhere('report.status = :status', {
          status: ReportStatusValues.OPEN,
        })
        .getCount(),
    ]);

    return { totalReports, openReports };
  }

  async getDangerousDonations(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const rows = await this.reportRepository
      .createQueryBuilder('report')
      .innerJoin(Donation, 'donation', 'donation.id = report.targetId')
      .leftJoin('donation.category', 'category')
      .where('report.targetType = :targetType', {
        targetType: ReportTargetTypeValues.DONATION,
      })
      .select([
        'donation.id AS "donationId"',
        'donation.title AS "title"',
        'donation.categoryId AS "categoryId"',
        'COALESCE(category.name, \'Unknown\') AS "categoryName"',
        `COALESCE(category.sensitivity, '${CategorySensitivityValues.LOW}') AS "categorySensitivity"`,
        'donation.safetyChecklistCompleted AS "safetyChecklistCompleted"',
        'COUNT(report.id)::text AS "reportCount"',
        'MAX(report.createdAt) AS "lastReportedAt"',
      ])
      .groupBy('donation.id')
      .addGroupBy('donation.title')
      .addGroupBy('donation.categoryId')
      .addGroupBy('category.name')
      .addGroupBy('category.sensitivity')
      .addGroupBy('donation.safetyChecklistCompleted')
      .orderBy('COUNT(report.id)', 'DESC')
      .addOrderBy('MAX(report.createdAt)', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany<DangerousDonationRow>();

    const countRows = await this.reportRepository
      .createQueryBuilder('report')
      .where('report.targetType = :targetType', {
        targetType: ReportTargetTypeValues.DONATION,
      })
      .select('COUNT(DISTINCT report.targetId)', 'count')
      .getRawOne<{ count: string }>();

    const items = rows.map((row) => {
      const reportCount = Number(row.reportCount);
      const sensitivityWeight = this.getSensitivityWeight(
        row.categorySensitivity,
      );
      const safetyPenalty = row.safetyChecklistCompleted ? 0 : 2;
      const riskScore = Number(
        (reportCount * 1.5 + sensitivityWeight + safetyPenalty).toFixed(2),
      );

      return {
        donationId: row.donationId,
        title: row.title,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categorySensitivity: row.categorySensitivity,
        reportCount,
        safetyChecklistCompleted: row.safetyChecklistCompleted,
        riskScore,
        lastReportedAt: row.lastReportedAt,
      };
    });

    const totalCount = Number(countRows?.count || 0);

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: totalCount > skip + limit,
      hasPreviousPage: page > 1,
    };
  }

  async getReportStats(input: ReportStatsInput): Promise<ReportStatsType> {
    const now = new Date();
    const statusFilter =
      input.statusFilter ?? ReportStatsStatusFilterValues.ALL;

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const [
      totalReports,
      openReports,
      previousTotalReports,
      previousOpenReports,
    ] = await Promise.all([
      this.reportRepository.count(),
      this.reportRepository.count({
        where: { status: ReportStatusValues.OPEN },
      }),
      this.reportRepository
        .createQueryBuilder('report')
        .where('report.createdAt >= :startOfPreviousMonth', {
          startOfPreviousMonth,
        })
        .andWhere('report.createdAt < :startOfCurrentMonth', {
          startOfCurrentMonth,
        })
        .getCount(),
      this.reportRepository
        .createQueryBuilder('report')
        .where('report.createdAt >= :startOfPreviousMonth', {
          startOfPreviousMonth,
        })
        .andWhere('report.createdAt < :startOfCurrentMonth', {
          startOfCurrentMonth,
        })
        .andWhere('report.status = :status', {
          status: ReportStatusValues.OPEN,
        })
        .getCount(),
    ]);

    const totalReportsIncrease = this.calculateIncrease(
      totalReports,
      previousTotalReports,
    );
    const openReportsIncrease = this.calculateIncrease(
      openReports,
      previousOpenReports,
    );

    const { fromDate, granularity } = this.resolvePeriodWindow(
      input.period,
      now,
    );
    const rows = await this.getReportGrowthRows(
      fromDate,
      granularity,
      statusFilter,
    );

    const countMap = new Map<string, number>();
    for (const row of rows) {
      countMap.set(row.period, Number(row.count));
    }

    const buckets = this.buildPeriods(fromDate, now, granularity);
    const chart = buckets.map((period) => ({
      period,
      reportsCount: countMap.get(period) ?? 0,
    }));

    return {
      totalReports,
      totalReportsIncrease,
      openReports,
      openReportsIncrease,
      chart,
    };
  }

  async getReportsForExport() {
    return this.reportRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getDangerousDonationsForExport() {
    const result = await this.getDangerousDonations(1, 10000);
    return result.items;
  }

  private async ensureTargetExists(
    targetType: ReportTargetType,
    targetId: string,
  ) {
    if (targetType === ReportTargetTypeValues.DONATION) {
      const donation = await this.donationRepository.findOne({
        where: { id: targetId },
      });
      if (!donation) {
        throwAppError('DONATION_NOT_FOUND', { id: targetId });
      }
      return;
    }

    if (targetType === ReportTargetTypeValues.MESSAGE) {
      const message = await this.messageRepository.findOne({
        where: { id: targetId },
      });
      if (!message) {
        throwAppError('CHAT_MESSAGE_NOT_FOUND', { id: targetId });
      }
      return;
    }

    const user = await this.userRepository.findOne({ where: { id: targetId } });
    if (!user) {
      throwAppError('USER_NOT_FOUND');
    }
  }

  private getSensitivityWeight(sensitivity: CategorySensitivity): number {
    if (sensitivity === CategorySensitivityValues.HIGH) {
      return 3;
    }

    if (sensitivity === CategorySensitivityValues.MEDIUM) {
      return 2;
    }

    return 1;
  }

  private resolvePeriodWindow(
    period: string,
    now: Date,
  ): { fromDate: Date; granularity: 'day' | 'month' } {
    if (period === ReportStatsPeriodValues.LAST_WEEK) {
      const fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 6);
      fromDate.setHours(0, 0, 0, 0);
      return { fromDate, granularity: 'day' };
    }

    if (period === ReportStatsPeriodValues.LAST_MONTH) {
      const fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 29);
      fromDate.setHours(0, 0, 0, 0);
      return { fromDate, granularity: 'day' };
    }

    const fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    fromDate.setHours(0, 0, 0, 0);
    return { fromDate, granularity: 'month' };
  }

  private async getReportGrowthRows(
    fromDate: Date,
    granularity: 'day' | 'month',
    statusFilter: string,
  ) {
    const dateFormat = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .select(`TO_CHAR(report.createdAt, '${dateFormat}')`, 'period')
      .addSelect('COUNT(report.id)', 'count')
      .where('report.createdAt >= :fromDate', { fromDate })
      .groupBy('period')
      .orderBy('period', 'ASC');

    const normalizedStatus = this.mapStatusFilterToStatus(statusFilter);
    if (normalizedStatus) {
      qb.andWhere('report.status = :status', { status: normalizedStatus });
    }

    return qb.getRawMany<{ period: string; count: string }>();
  }

  private mapStatusFilterToStatus(statusFilter: string): ReportStatus | null {
    if (statusFilter === ReportStatsStatusFilterValues.ALL) {
      return null;
    }

    if (statusFilter === ReportStatsStatusFilterValues.OPEN) {
      return ReportStatusValues.OPEN;
    }

    if (statusFilter === ReportStatsStatusFilterValues.UNDER_REVIEW) {
      return ReportStatusValues.UNDER_REVIEW;
    }

    if (
      statusFilter === ReportStatsStatusFilterValues.RESOLVED ||
      statusFilter === ReportStatsStatusFilterValues.ACCEPTED
    ) {
      return ReportStatusValues.RESOLVED;
    }

    return ReportStatusValues.REJECTED;
  }

  private buildPeriods(
    fromDate: Date,
    toDate: Date,
    granularity: 'day' | 'month',
  ): string[] {
    const periods: string[] = [];
    const cursor = new Date(fromDate);

    if (granularity === 'day') {
      while (cursor <= toDate) {
        periods.push(this.formatDay(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      return periods;
    }

    while (cursor <= toDate) {
      periods.push(this.formatMonth(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return periods;
  }

  private formatDay(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private calculateIncrease(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    const increase = ((current - previous) / previous) * 100;
    return Math.round(increase * 100) / 100;
  }
}
