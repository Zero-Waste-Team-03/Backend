import dataSource from 'src/infrastructure/db/data-source';
import { Badge } from 'src/core/gamification/entities/badge.entity';
import { Attachment } from 'src/common/modules/attachment/entities/attachment.entity';
import { User } from 'src/core/user/entities/user.entity';

type SeedBadge = {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  iconFileName?: string;
  iconOwnerEmail?: string;
};

const BADGES_TO_SEED: SeedBadge[] = [
  {
    code: 'FIRST_DONATION_COMPLETED',
    name: 'First Donation',
    description: 'Awarded after completing your first donation handover.',
    sortOrder: 10,
    isActive: true,
    iconFileName: 'admin-avatar.jpg',
    iconOwnerEmail: 'admin@gaspzero.local',
  },
  {
    code: 'FIRST_PICKUP_COMPLETED',
    name: 'First Pickup',
    description: 'Awarded after completing your first pickup as beneficiary.',
    sortOrder: 20,
    isActive: true,
    iconFileName: 'user-profile-photo.png',
    iconOwnerEmail: 'user@gaspzero.local',
  },
  {
    code: 'FIVE_COMPLETIONS',
    name: 'Community Helper',
    description: 'Awarded after five completed initiatives.',
    sortOrder: 30,
    isActive: true,
    iconFileName: 'generated-file-1.jpg',
    iconOwnerEmail: 'admin@gaspzero.local',
  },
  {
    code: 'TEN_DONATIONS',
    name: 'Generous Donor',
    description: 'Awarded after ten completed donations.',
    sortOrder: 40,
    isActive: true,
    iconFileName: 'generated-file-2.png',
    iconOwnerEmail: 'user@gaspzero.local',
  },
  {
    code: 'FOOD_SAVER',
    name: 'Food Saver',
    description: 'Awarded when your reputation score exceeds 500.',
    sortOrder: 50,
    isActive: true,
    iconFileName: 'org-banner.webp',
    iconOwnerEmail: 'organization@gaspzero.local',
  },
  {
    code: 'NIGHT_RESCUER',
    name: 'Night Rescuer',
    description: 'Completed at least one donation handover at night.',
    sortOrder: 60,
    isActive: true,
  },
];

async function resolveAttachmentId(
  fileName?: string,
  ownerEmail?: string,
): Promise<string | null> {
  if (!fileName || !ownerEmail) {
    return null;
  }

  const userRepo = dataSource.getRepository(User);
  const attachmentRepo = dataSource.getRepository(Attachment);

  const owner = await userRepo.findOne({ where: { email: ownerEmail } });
  if (!owner) {
    process.stderr.write(
      `[seed-badges] Attachment owner "${ownerEmail}" not found for file "${fileName}". Run seed-users first.\n`,
    );
    return null;
  }

  const attachment = await attachmentRepo.findOne({
    where: {
      fileName,
      uploadedById: owner.id,
    },
  });

  if (!attachment) {
    process.stderr.write(
      `[seed-badges] Attachment "${fileName}" not found for owner "${ownerEmail}". Run seed-attachments first.\n`,
    );
    return null;
  }

  return attachment.id;
}

async function upsertBadge(seed: SeedBadge): Promise<void> {
  const badgeRepo = dataSource.getRepository(Badge);

  const iconAttachmentId = await resolveAttachmentId(
    seed.iconFileName,
    seed.iconOwnerEmail,
  );

  const existing = await badgeRepo.findOne({
    where: { code: seed.code },
  });

  if (existing) {
    badgeRepo.merge(existing, {
      name: seed.name,
      description: seed.description,
      sortOrder: seed.sortOrder,
      isActive: seed.isActive,
      iconAttachmentId,
    });
    await badgeRepo.save(existing);
    return;
  }

  const badge = badgeRepo.create({
    code: seed.code,
    name: seed.name,
    description: seed.description,
    sortOrder: seed.sortOrder,
    isActive: seed.isActive,
    iconAttachmentId,
  });
  await badgeRepo.save(badge);
}

async function seedBadges(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const badge of BADGES_TO_SEED) {
      await upsertBadge(badge);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedBadges()
  .then(() => {
    process.stdout.write('Badge seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Badge seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
