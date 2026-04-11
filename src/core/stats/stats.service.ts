import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Donation,
  DonationStatus,
  DonationStatusValues,
} from '../donation/entities/donation.entity';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/v1/user.service';
import { AdminDashboardStatsInput } from './graphql/inputs/admin-dashboard-stats.input';
import {
  StatsGrowthInput,
  StatsGrowthPeriodValues,
} from './graphql/inputs/stats-growth.input';
import { StatsGrowthPointType } from './graphql/types/stats-growth.type';

@Injectable()
export class StatsService {
  private readonly co2FactorKgPerFoodKg = 2.5;
  private readonly fallbackFoodKgPerQuantityUnit = 0.5;
  private readonly filteredStatuses: DonationStatus[] = [
    DonationStatusValues.PUBLISHED,
    DonationStatusValues.RESERVED,
    DonationStatusValues.COMPLETED,
  ];

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
  ) {}

  async getAdminDashboardStats(input?: AdminDashboardStatsInput) {
    const applyDonationStatusFilter = Boolean(input?.applyDonationStatusFilter);

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const [donationStats, activeUserStats] = await Promise.all([
      this.getDonationDashboardStats(
        startOfCurrentMonth,
        startOfPreviousMonth,
        applyDonationStatusFilter,
      ),
      this.userService.getUserStats(),
    ]);

    return {
      totalDonations: donationStats.totalDonations,
      totalDonationsIncrease: donationStats.totalDonationsIncrease,
      activeUsers: activeUserStats.activeAccounts,
      activeUsersIncrease: activeUserStats.activeAccountsIncrease,
      foodSavedKg: donationStats.foodSavedKg,
      foodSavedKgIncrease: donationStats.foodSavedKgIncrease,
      co2SavedKg: donationStats.co2SavedKg,
      co2SavedKgIncrease: donationStats.co2SavedKgIncrease,
    };
  }

  async getGrowthStats(input: StatsGrowthInput) {
    const now = new Date();
    const applyDonationStatusFilter = Boolean(input.applyDonationStatusFilter);

    let fromDate: Date;
    let granularity: 'day' | 'month';

    if (input.period === StatsGrowthPeriodValues.LAST_WEEK) {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 6);
      fromDate.setHours(0, 0, 0, 0);
      granularity = 'day';
    } else if (input.period === StatsGrowthPeriodValues.LAST_MONTH) {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 29);
      fromDate.setHours(0, 0, 0, 0);
      granularity = 'day';
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      fromDate.setHours(0, 0, 0, 0);
      granularity = 'month';
    }

    const [donationRows, userRows] = await Promise.all([
      this.getDonationGrowthRows(
        fromDate,
        granularity,
        applyDonationStatusFilter,
      ),
      this.getUserGrowthRows(fromDate, granularity),
    ]);

    const donationMap = new Map<string, number>();
    for (const row of donationRows) {
      donationMap.set(row.period, Number(row.count));
    }

    const userMap = new Map<string, number>();
    for (const row of userRows) {
      userMap.set(row.period, Number(row.count));
    }

    const periods = this.buildPeriods(fromDate, now, granularity);
    const points: StatsGrowthPointType[] = periods.map((period) => ({
      period,
      donationsCount: donationMap.get(period) ?? 0,
      usersCount: userMap.get(period) ?? 0,
    }));

    return { points };
  }

  private async getDonationDashboardStats(
    startOfCurrentMonth: Date,
    startOfPreviousMonth: Date,
    applyDonationStatusFilter: boolean,
  ) {
    const totalBaseQb = this.donationRepository.createQueryBuilder('donation');
    const previousBaseQb = this.donationRepository
      .createQueryBuilder('donation')
      .where('donation.createdAt < :startOfCurrentMonth', {
        startOfCurrentMonth,
      });

    if (applyDonationStatusFilter) {
      totalBaseQb.andWhere('donation.status IN (:...statuses)', {
        statuses: this.filteredStatuses,
      });
      previousBaseQb.andWhere('donation.status IN (:...statuses)', {
        statuses: this.filteredStatuses,
      });
    }

    const [
      totalDonations,
      previousTotalDonations,
      foodTotals,
      previousFoodTotals,
    ] = await Promise.all([
      totalBaseQb.getCount(),
      previousBaseQb.getCount(),
      this.getFoodTotals(undefined, undefined, applyDonationStatusFilter),
      this.getFoodTotals(
        startOfPreviousMonth,
        startOfCurrentMonth,
        applyDonationStatusFilter,
      ),
    ]);

    const totalDonationsIncrease = this.calculateIncrease(
      totalDonations,
      previousTotalDonations,
    );

    const foodSavedKg = Number(foodTotals.totalFoodKg.toFixed(2));
    const previousFoodSavedKg = Number(
      previousFoodTotals.totalFoodKg.toFixed(2),
    );
    const foodSavedKgIncrease = this.calculateIncrease(
      foodSavedKg,
      previousFoodSavedKg,
    );

    const co2SavedKg = Number(
      (foodTotals.totalFoodKg * this.co2FactorKgPerFoodKg).toFixed(2),
    );
    const previousCo2SavedKg = Number(
      (previousFoodTotals.totalFoodKg * this.co2FactorKgPerFoodKg).toFixed(2),
    );
    const co2SavedKgIncrease = this.calculateIncrease(
      co2SavedKg,
      previousCo2SavedKg,
    );

    return {
      totalDonations,
      totalDonationsIncrease,
      foodSavedKg,
      foodSavedKgIncrease,
      co2SavedKg,
      co2SavedKgIncrease,
    };
  }

  private async getFoodTotals(
    startInclusive?: Date,
    endExclusive?: Date,
    applyDonationStatusFilter?: boolean,
  ) {
    const qb = this.donationRepository.createQueryBuilder('donation');

    if (startInclusive) {
      qb.andWhere('donation.createdAt >= :startInclusive', { startInclusive });
    }

    if (endExclusive) {
      qb.andWhere('donation.createdAt < :endExclusive', { endExclusive });
    }

    if (applyDonationStatusFilter) {
      qb.andWhere('donation.status IN (:...statuses)', {
        statuses: this.filteredStatuses,
      });
    }

    const raw = await qb
      .select(
        'COALESCE(SUM(COALESCE(donation."foodWeightKg"::double precision, donation.quantity::double precision * CAST(:fallbackKgPerUnit AS double precision))), 0)',
        'totalFoodKg',
      )
      .setParameter('fallbackKgPerUnit', this.fallbackFoodKgPerQuantityUnit)
      .getRawOne<{ totalFoodKg: string }>();

    return { totalFoodKg: Number(raw?.totalFoodKg ?? 0) };
  }

  private async getDonationGrowthRows(
    fromDate: Date,
    granularity: 'day' | 'month',
    applyDonationStatusFilter: boolean,
  ) {
    const dateFormat = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

    const qb = this.donationRepository
      .createQueryBuilder('donation')
      .select(`TO_CHAR(donation.createdAt, '${dateFormat}')`, 'period')
      .addSelect('COUNT(donation.id)', 'count')
      .where('donation.createdAt >= :fromDate', { fromDate })
      .groupBy('period')
      .orderBy('period', 'ASC');

    if (applyDonationStatusFilter) {
      qb.andWhere('donation.status IN (:...statuses)', {
        statuses: this.filteredStatuses,
      });
    }

    return qb.getRawMany<{ period: string; count: string }>();
  }

  private async getUserGrowthRows(
    fromDate: Date,
    granularity: 'day' | 'month',
  ) {
    const dateFormat = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

    return this.userRepository
      .createQueryBuilder('user')
      .select(`TO_CHAR(user.createdAt, '${dateFormat}')`, 'period')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.createdAt >= :fromDate', { fromDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany<{ period: string; count: string }>();
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
