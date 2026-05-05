import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Badge } from './entities/badge.entity';
import { Achievement } from './entities/achievement.entity';
import {
  Reservation,
  ReservationStatusValues,
} from '../reservation/entities/reservation.entity';
import {
  Donation,
  DonationStatusValues,
} from '../donation/entities/donation.entity';
import { User } from '../user/entities/user.entity';
import { CreateBadgeInput } from './graphql/inputs/create-badge.input';
import { UpdateBadgeInput } from './graphql/inputs/update-badge.input';
import { throwAppError } from 'src/common/errors';

const BADGE_CODES = {
  FIRST_DONATION_COMPLETED: 'FIRST_DONATION_COMPLETED',
  FIRST_PICKUP_COMPLETED: 'FIRST_PICKUP_COMPLETED',
  FIVE_COMPLETIONS: 'FIVE_COMPLETIONS',
  TEN_DONATIONS: 'TEN_DONATIONS',
  FOOD_SAVER: 'FOOD_SAVER',
} as const;

type BadgeCode = (typeof BADGE_CODES)[keyof typeof BADGE_CODES];

export interface AwardedAchievement {
  id: string;
  userId: string;
  badge: Badge;
}

@Injectable()
export class GamificationService implements OnModuleInit {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
  ) {}

  private readonly defaultBadges: Array<{
    id: string;
    code: BadgeCode;
    name: string;
    description: string;
    sortOrder: number;
    iconAttachmentId?: string | null;
  }> = [
    {
      id: '0196488c-2f54-7d65-8a74-2f9f795f3001',
      code: BADGE_CODES.FIRST_DONATION_COMPLETED,
      name: 'First Donation',
      description: 'Awarded after completing your first donation handover.',
      sortOrder: 10,
    },
    {
      id: '0196488c-2f54-7d65-8a74-2f9f795f3002',
      code: BADGE_CODES.FIRST_PICKUP_COMPLETED,
      name: 'First Pickup',
      description: 'Awarded after completing your first pickup as beneficiary.',
      sortOrder: 20,
    },
    {
      id: '0196488c-2f54-7d65-8a74-2f9f795f3003',
      code: BADGE_CODES.FIVE_COMPLETIONS,
      name: 'Community Helper',
      description: 'Awarded after five completed initiatives.',
      sortOrder: 30,
    },
    {
      id: '0196488c-2f54-7d65-8a74-2f9f795f3004',
      code: BADGE_CODES.TEN_DONATIONS,
      name: 'Generous Donor',
      description: 'Awarded after ten completed donations.',
      sortOrder: 40,
    },
    {
      id: '0196488c-2f54-7d65-8a74-2f9f795f3005',
      code: BADGE_CODES.FOOD_SAVER,
      name: 'Food Saver',
      description: 'Awarded when your reputation score exceeds 500.',
      sortOrder: 50,
    },
  ];

  async onModuleInit(): Promise<void> {
    await this.badgeRepository.upsert(this.defaultBadges, ['code']);
  }

  async createBadge(input: CreateBadgeInput): Promise<Badge> {
    const badge = this.badgeRepository.create(input);
    return this.badgeRepository.save(badge);
  }

  async updateBadge(id: string, input: UpdateBadgeInput): Promise<Badge> {
    const badge = await this.badgeRepository.findOne({ where: { id } });
    if (!badge) {
      throwAppError('BADGE_NOT_FOUND', { id });
    }

    Object.assign(badge, input);
    return this.badgeRepository.save(badge);
  }

  /**
   * Gets all active badges sorted for profile/catalog usage.
   */
  async getBadgeCatalog(): Promise<Badge[]> {
    return this.badgeRepository.find({
      where: { isActive: true },
      relations: { iconAttachment: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Returns user achievements with badge details.
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { userId },
      relations: { badge: true },
      order: { awardedAt: 'DESC' },
    });
  }

  /**
   * Returns badges currently earned by the given user.
   */
  async getUserBadges(userId: string): Promise<Badge[]> {
    const achievements = await this.achievementRepository.find({
      where: { userId },
      relations: { badge: { iconAttachment: true } },
      order: { awardedAt: 'DESC' },
    });

    return achievements
      .map((achievement) => achievement.badge)
      .filter((badge): badge is Badge => Boolean(badge));
  }

  /**
   * Evaluates donor and beneficiary after a completed transaction.
   */
  async evaluateAndAwardCompletionBadges(
    manager: EntityManager,
    donorId: string,
    beneficiaryId: string,
  ): Promise<AwardedAchievement[]> {
    const awarded: AwardedAchievement[] = [];

    const donorAwards = await this.evaluateUserBadges(manager, donorId, true);
    awarded.push(...donorAwards);

    if (beneficiaryId !== donorId) {
      const beneficiaryAwards = await this.evaluateUserBadges(
        manager,
        beneficiaryId,
        false,
      );
      awarded.push(...beneficiaryAwards);
    }

    return awarded;
  }

  async evaluateAndAwardCompletionBadgesWithoutManager(
    donorId: string,
    beneficiaryId: string,
  ): Promise<AwardedAchievement[]> {
    return this.dataSource.transaction((manager) =>
      this.evaluateAndAwardCompletionBadges(manager, donorId, beneficiaryId),
    );
  }

  private async evaluateUserBadges(
    manager: EntityManager,
    userId: string,
    isDonorContext: boolean,
  ): Promise<AwardedAchievement[]> {
    const badgesRepo = manager.getRepository(Badge);
    const achievementsRepo = manager.getRepository(Achievement);
    const donationsRepo = manager.getRepository(Donation);
    const reservationsRepo = manager.getRepository(Reservation);
    const usersRepo = manager.getRepository(User);

    const [user, completedDonationsCount, completedPickupsCount] =
      await Promise.all([
        usersRepo.findOne({
          where: { id: userId },
          select: { id: true, reputationScore: true },
        }),
        donationsRepo.count({
          where: {
            userId,
            status: DonationStatusValues.COMPLETED,
          },
        }),
        reservationsRepo.count({
          where: {
            beneficiaryId: userId,
            status: ReservationStatusValues.COMPLETED,
          },
        }),
      ]);

    if (!user) {
      return [];
    }

    const totalCompletions = completedDonationsCount + completedPickupsCount;

    const candidates: Array<{ code: BadgeCode; eligible: boolean }> = [
      {
        code: BADGE_CODES.FIRST_DONATION_COMPLETED,
        eligible: isDonorContext && completedDonationsCount >= 1,
      },
      {
        code: BADGE_CODES.FIRST_PICKUP_COMPLETED,
        eligible: !isDonorContext && completedPickupsCount >= 1,
      },
      {
        code: BADGE_CODES.FIVE_COMPLETIONS,
        eligible: totalCompletions >= 5,
      },
      {
        code: BADGE_CODES.TEN_DONATIONS,
        eligible: completedDonationsCount >= 10,
      },
      {
        code: BADGE_CODES.FOOD_SAVER,
        eligible: user.reputationScore > 500,
      },
    ];

    const activeBadges = await badgesRepo.find({
      where: { isActive: true },
    });

    const badgeByCode = new Map(
      activeBadges.map((badge) => [badge.code, badge]),
    );

    const awarded: AwardedAchievement[] = [];

    for (const candidate of candidates) {
      if (!candidate.eligible) {
        continue;
      }

      const badge = badgeByCode.get(candidate.code);
      if (!badge) {
        continue;
      }

      const existing = await achievementsRepo.findOne({
        where: { userId, badgeId: badge.id },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const achievement = achievementsRepo.create({
        userId,
        badgeId: badge.id,
        awardedAt: new Date(),
      });

      const saved = await achievementsRepo.save(achievement);
      awarded.push({
        id: saved.id,
        userId,
        badge,
      });
    }

    return awarded;
  }
}
