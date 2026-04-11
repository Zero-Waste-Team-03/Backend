import dataSource from 'src/infrastructure/db/data-source';
import { Achievement } from 'src/core/gamification/entities/achievement.entity';
import { Badge } from 'src/core/gamification/entities/badge.entity';
import { User } from 'src/core/user/entities/user.entity';

type SeedAchievement = {
  userEmail: string;
  badgeCode: string;
  awardedAt: Date;
};

const ACHIEVEMENTS_TO_SEED: SeedAchievement[] = [
  {
    userEmail: 'admin@gaspzero.local',
    badgeCode: 'FIRST_DONATION_COMPLETED',
    awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
  },
  {
    userEmail: 'admin@gaspzero.local',
    badgeCode: 'FOOD_SAVER',
    awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    userEmail: 'user@gaspzero.local',
    badgeCode: 'FIRST_PICKUP_COMPLETED',
    awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    userEmail: 'organization@gaspzero.local',
    badgeCode: 'FIVE_COMPLETIONS',
    awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
];

async function upsertAchievement(seed: SeedAchievement): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const badgeRepo = dataSource.getRepository(Badge);
  const achievementRepo = dataSource.getRepository(Achievement);

  const [user, badge] = await Promise.all([
    userRepo.findOne({ where: { email: seed.userEmail } }),
    badgeRepo.findOne({ where: { code: seed.badgeCode } }),
  ]);

  if (!user) {
    process.stderr.write(
      `[seed-achievements] Skipping badge "${seed.badgeCode}": user "${seed.userEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  if (!badge) {
    process.stderr.write(
      `[seed-achievements] Skipping user "${seed.userEmail}": badge "${seed.badgeCode}" not found. Run seed-badges first.\n`,
    );
    return;
  }

  const existing = await achievementRepo.findOne({
    where: { userId: user.id, badgeId: badge.id },
  });

  if (existing) {
    achievementRepo.merge(existing, {
      awardedAt: seed.awardedAt,
    });
    await achievementRepo.save(existing);
    return;
  }

  const achievement = achievementRepo.create({
    userId: user.id,
    badgeId: badge.id,
    awardedAt: seed.awardedAt,
  });

  await achievementRepo.save(achievement);
}

async function seedAchievements(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const achievement of ACHIEVEMENTS_TO_SEED) {
      await upsertAchievement(achievement);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedAchievements()
  .then(() => {
    process.stdout.write('Achievement seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Achievement seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
