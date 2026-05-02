import dataSource from 'src/infrastructure/db/data-source';
import { Token } from 'src/core/notifications/entities/token.entity';
import { User } from 'src/core/user/entities/user.entity';

/**
 * @fileoverview Seed script for the `tokens` table (FCM device tokens).
 *
 * Upserts FCM tokens linked to the seeded base users.  The `fcmToken` value
 * is used as the unique key, matching the UNIQUE constraint defined on the
 * `tokens` table.  Safe to re-run without creating duplicates.
 *
 * @example
 * ```bash
 * pnpm ts-node -r tsconfig-paths/register \
 *   src/common/scripts/seed/seed-tokens.ts
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeedToken = {
  /** Firebase Cloud Messaging token */
  fcmToken: string;
  /** Stable per-device identifier (unique per user) */
  deviceId: string;
  /** email of the owning user (must already be seeded) */
  userEmail: string;
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const BASE_TOKENS: SeedToken[] = [
  {
    fcmToken: 'seed_fcm_admin_device_01:APA91bHPRgkFLo...AdminToken',
    deviceId: 'seed-device-admin-01',
    userEmail: 'admin@gaspzero.local',
  },
  {
    fcmToken: 'seed_fcm_admin_device_02:APA91bHPRgkFLo...AdminToken2',
    deviceId: 'seed-device-admin-02',
    userEmail: 'admin@gaspzero.local',
  },
  {
    fcmToken: 'seed_fcm_user_device_01:bk3RNwTe3H0...UserToken',
    deviceId: 'seed-device-user-01',
    userEmail: 'user@gaspzero.local',
  },
  {
    fcmToken: 'seed_fcm_org_device_01:c9RNwTe3H0...OrgToken',
    deviceId: 'seed-device-org-01',
    userEmail: 'organization@gaspzero.local',
  },
];

/**
 * Generates additional fake FCM tokens spread across the base users.
 */
function generateRandomTokens(count: number): SeedToken[] {
  const emails = [
    'admin@gaspzero.local',
    'user@gaspzero.local',
    'organization@gaspzero.local',
  ];

  return Array.from({ length: count }, (_, i) => ({
    fcmToken: `seed_fcm_generated_${i + 1}:APA91bGenerated${i + 1}RandomToken`,
    deviceId: `seed-device-generated-${i + 1}`,
    userEmail: emails[i % emails.length],
  }));
}

const TOKENS_TO_SEED: SeedToken[] = [
  ...BASE_TOKENS,
  ...generateRandomTokens(10),
];

// ---------------------------------------------------------------------------
// Upsert logic
// ---------------------------------------------------------------------------

/**
 * Upserts a single FCM token record.
 * Matched by the `(userId, deviceId)` unique pair — refreshes `fcmToken`
 * if the same device re-registers.
 */
async function upsertToken(seed: SeedToken): Promise<void> {
  const tokenRepo = dataSource.getRepository(Token);
  const userRepo = dataSource.getRepository(User);

  const user = await userRepo.findOne({ where: { email: seed.userEmail } });

  if (!user) {
    process.stderr.write(
      `[seed-tokens] Skipping token for "${seed.userEmail}": user not found. Run seed-users first.\n`,
    );
    return;
  }

  const existing = await tokenRepo.findOne({
    where: { userId: user.id, deviceId: seed.deviceId },
  });

  if (existing) {
    tokenRepo.merge(existing, { fcmToken: seed.fcmToken });
    await tokenRepo.save(existing);
    return;
  }

  const token = tokenRepo.create({
    fcmToken: seed.fcmToken,
    deviceId: seed.deviceId,
    userId: user.id,
  });

  await tokenRepo.save(token);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Seeds FCM token records for local and QA usage.
 * Requires users to have been seeded first (`seed-users.ts`).
 */
async function seedTokens(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const token of TOKENS_TO_SEED) {
      await upsertToken(token);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedTokens()
  .then(() => {
    process.stdout.write('Token seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Token seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
