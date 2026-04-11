import dataSource from 'src/infrastructure/db/data-source';
import {
  Report,
  ReportStatusValues,
  ReportTargetTypeValues,
} from 'src/core/reporting/entities/report.entity';
import { User } from 'src/core/user/entities/user.entity';
import { Donation } from 'src/core/donation/entities/donation.entity';

type BaseSeedReport = {
  reporterEmail: string;
  reason: string;
  description?: string;
  status: Report['status'];
  reviewedByEmail?: string;
};

type SeedUserReport = BaseSeedReport & {
  targetType: typeof ReportTargetTypeValues.USER;
  targetUserEmail: string;
};

type SeedDonationReport = BaseSeedReport & {
  targetType: typeof ReportTargetTypeValues.DONATION;
  targetDonationTitle: string;
  targetDonationOwnerEmail: string;
};

type SeedReport = SeedUserReport | SeedDonationReport;

const REPORTS_TO_SEED: SeedReport[] = [
  {
    targetType: ReportTargetTypeValues.DONATION,
    targetDonationTitle: 'Cooked rice portions',
    targetDonationOwnerEmail: 'organization@gaspzero.local',
    reporterEmail: 'user@gaspzero.local',
    reason: 'Food safety concern',
    description: 'Missing clear storage temperature details.',
    status: ReportStatusValues.OPEN,
  },
  {
    targetType: ReportTargetTypeValues.DONATION,
    targetDonationTitle: 'Fresh baguettes',
    targetDonationOwnerEmail: 'user@gaspzero.local',
    reporterEmail: 'organization@gaspzero.local',
    reason: 'Expired listing timing mismatch',
    description: 'Listing availability window seems inconsistent.',
    status: ReportStatusValues.UNDER_REVIEW,
    reviewedByEmail: 'admin@gaspzero.local',
  },
  {
    targetType: ReportTargetTypeValues.DONATION,
    targetDonationTitle: 'Fruit crate assortment',
    targetDonationOwnerEmail: 'admin@gaspzero.local',
    reporterEmail: 'user@gaspzero.local',
    reason: 'Incorrect category metadata',
    description: 'Reported category may not match contents.',
    status: ReportStatusValues.RESOLVED,
    reviewedByEmail: 'admin@gaspzero.local',
  },
  {
    targetType: ReportTargetTypeValues.USER,
    targetUserEmail: 'organization@gaspzero.local',
    reporterEmail: 'user@gaspzero.local',
    reason: 'Abusive communication',
    description: 'Reported inappropriate behavior in chat.',
    status: ReportStatusValues.REJECTED,
    reviewedByEmail: 'admin@gaspzero.local',
  },
  {
    targetType: ReportTargetTypeValues.USER,
    targetUserEmail: 'user@gaspzero.local',
    reporterEmail: 'organization@gaspzero.local',
    reason: 'Spam reports abuse',
    description: 'User repeatedly files low-quality reports.',
    status: ReportStatusValues.OPEN,
  },
];

async function resolveTargetId(seed: SeedReport): Promise<string | null> {
  const userRepo = dataSource.getRepository(User);
  const donationRepo = dataSource.getRepository(Donation);

  if (seed.targetType === ReportTargetTypeValues.USER) {
    const targetUser = await userRepo.findOne({
      where: { email: seed.targetUserEmail },
    });
    return targetUser?.id ?? null;
  }

  const owner = await userRepo.findOne({
    where: { email: seed.targetDonationOwnerEmail },
  });
  if (!owner) return null;

  const donation = await donationRepo.findOne({
    where: {
      title: seed.targetDonationTitle,
      userId: owner.id,
    },
  });

  return donation?.id ?? null;
}

async function upsertReport(seed: SeedReport): Promise<void> {
  const reportRepo = dataSource.getRepository(Report);
  const userRepo = dataSource.getRepository(User);

  const reporter = await userRepo.findOne({
    where: { email: seed.reporterEmail },
  });

  if (!reporter) {
    process.stderr.write(
      `[seed-reports] Skipping report "${seed.reason}": reporter "${seed.reporterEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  const targetId = await resolveTargetId(seed);
  if (!targetId) {
    process.stderr.write(
      `[seed-reports] Skipping report "${seed.reason}": target not found for type "${seed.targetType}". Run dependent seeds first.\n`,
    );
    return;
  }

  let reviewedById: string | null = null;
  let reviewedAt: Date | null = null;

  if (seed.status !== ReportStatusValues.OPEN) {
    if (!seed.reviewedByEmail) {
      process.stderr.write(
        `[seed-reports] Skipping report "${seed.reason}": status "${seed.status}" requires reviewedByEmail.\n`,
      );
      return;
    }

    const reviewer = await userRepo.findOne({
      where: { email: seed.reviewedByEmail },
    });

    if (!reviewer) {
      process.stderr.write(
        `[seed-reports] Skipping report "${seed.reason}": reviewer "${seed.reviewedByEmail}" not found.\n`,
      );
      return;
    }

    reviewedById = reviewer.id;
    reviewedAt = new Date();
  }

  const existing = await reportRepo.findOne({
    where: {
      reporterId: reporter.id,
      targetType: seed.targetType,
      targetId,
      reason: seed.reason,
    },
  });

  if (existing) {
    reportRepo.merge(existing, {
      description: seed.description ?? null,
      status: seed.status,
      reviewedById,
      reviewedAt,
    });
    await reportRepo.save(existing);
    return;
  }

  const report = reportRepo.create({
    reporterId: reporter.id,
    targetType: seed.targetType,
    targetId,
    reason: seed.reason,
    description: seed.description ?? null,
    status: seed.status,
    reviewedById,
    reviewedAt,
  });

  await reportRepo.save(report);
}

async function seedReports(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const report of REPORTS_TO_SEED) {
      await upsertReport(report);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedReports()
  .then(() => {
    process.stdout.write('Report seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Report seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
