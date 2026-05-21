import { Logger } from '@nestjs/common';
import { ReputationLog, ReputationLogSourceValues } from '../../../core/leaderboard/entities/reputation-log.entity';
import dataSource from 'src/infrastructure/db/data-source';
import { User } from 'src/core/user/entities/user.entity';

const logger = new Logger('SeedReputationLogs');

async function seedReputationLogs() {
  try {
    await dataSource.initialize();

    const userRepo = dataSource.getRepository(User);
    const reputationLogRepository = dataSource.getRepository(ReputationLog);

    logger.log('Starting ReputationLog seeding...');

    const allUsers =await userRepo.find();

    if (!allUsers || allUsers.length === 0) {
      logger.warn('No users found. Please run seed-users.ts first.');
      return;
    }

    logger.log(`Found ${allUsers.length} users. Creating ReputationLog entries...`);

    // Clear existing reputation logs to avoid duplicates for seeding
    await reputationLogRepository.query('TRUNCATE TABLE "reputation_logs" RESTART IDENTITY CASCADE;');
    logger.log('Cleared existing reputation logs.');

    const logsToCreate: ReputationLog[] = [];
    for (const user of allUsers) {
      // Create some logs for each user to build up their score
      const numberOfLogs = Math.floor(Math.random() * 5) + 1; // 1 to 5 logs per user
      for (let i = 0; i < numberOfLogs; i++) {
        const points = Math.floor(Math.random() * 100) + 10; // 10 to 100 points per log
        logsToCreate.push(reputationLogRepository.create({
          userId: user.id,
          pointsGained: points,
          source: ReputationLogSourceValues.DONATION_COMPLETED,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        }));
      }
    }

    await reputationLogRepository.save(logsToCreate);
    logger.log(`Created ${logsToCreate.length} ReputationLog entries.`);
    logger.log('ReputationLog seeding completed successfully.');
  } catch (error) {
    logger.error(`ReputationLog seeding failed: ${error.message}`, error.stack);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

seedReputationLogs().then(() => {
  console.log('Seeding process finished.');
  process.exit(0);


}).catch((error) => {
  console.error(`Seeding process failed: ${error.message}`, error.stack);
});
