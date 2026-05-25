import { ReputationLog } from 'src/core/leaderboard/entities/reputation-log.entity';
import dataSource from 'src/infrastructure/db/data-source';
import Redis from 'ioredis';

async function syncLeaderboard() {
  console.log('Initializing DB connection...');
  await dataSource.initialize();
  console.log('DB Connection successful!');

  const redisPort = process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT, 10)
    : 6379;
  const redisHost = process.env.REDIS_HOST || 'localhost';

  console.log(`Connecting to Redis at ${redisHost}:${redisPort}...`);
  const client = new Redis({
    host: redisHost,
    port: redisPort,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
  });

  const logRepo = dataSource.getRepository(ReputationLog);

  console.log('Clearing old leaderboard keys in Redis...');
  const keys = await client.keys('leaderboard:*');
  if (keys && keys.length > 0) {
    await client.del(...keys);
  }

  console.log('Fetching all ReputationLogs from DB...');
  const logs = await logRepo.find({
    select: ['userId', 'pointsGained', 'createdAt'],
  });

  console.log(`Found ${logs.length} logs. Syncing to Redis...`);

  let count = 0;
  for (const log of logs) {
    const year = log.createdAt.getFullYear();
    const month = String(log.createdAt.getMonth() + 1).padStart(2, '0');
    const monthlyKey = `leaderboard:monthly:${year}-${month}`;
    const allTimeKey = 'leaderboard:all_time';

    const points = log.pointsGained;
    const userId = log.userId;

    await client.zincrby(allTimeKey, points, userId);
    await client.zincrby(monthlyKey, points, userId);

    count++;
    if (count % 100 === 0) {
      console.log(`Synced ${count}/${logs.length} logs...`);
    }
  }

  console.log('Sync complete.');
  client.disconnect();
  await dataSource.destroy();
}

syncLeaderboard()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error('Failed to sync leaderboard:', e);
    process.exit(1);
  });
