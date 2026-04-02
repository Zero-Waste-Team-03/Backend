import dataSource from 'src/infrastructure/db/data-source';
import {
  Donation,
  DonationStatusValues,
} from 'src/core/donation/entities/donation.entity';
import { User } from 'src/core/user/entities/user.entity';
import { Category } from 'src/core/category/entities/category.entity';
import { Attachment } from 'src/common/modules/attachment/entities/attachment.entity';

type SeedDonation = {
  title: string;
  description: string;
  quantity: number;
  specification: Record<string, any>;
  expiryDate: Date;
  status: Donation['status'];
  donorEmail: string;
  categoryName: string;
  attachmentFileName?: string;
};

const DONATIONS_TO_SEED: SeedDonation[] = [
  {
    title: 'Fresh baguettes',
    description: 'Unsold baguettes from this morning batch.',
    quantity: 20,
    specification: { packaging: 'paper', allergens: ['gluten'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 10),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'user@gaspzero.local',
    categoryName: 'Bakery',
    attachmentFileName: 'user-profile-photo.png',
  },
  {
    title: 'Cooked rice portions',
    description: 'Prepared meal portions from event catering.',
    quantity: 12,
    specification: { requiresColdChain: true, allergens: [] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 6),
    status: DonationStatusValues.DRAFT,
    donorEmail: 'organization@gaspzero.local',
    categoryName: 'Cooked Meals',
  },
  {
    title: 'Fruit crate assortment',
    description: 'Mixed fruits close to display deadline but still consumable.',
    quantity: 8,
    specification: { items: ['apples', 'bananas', 'oranges'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 18),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'admin@gaspzero.local',
    categoryName: 'Fruits & Vegetables',
    attachmentFileName: 'admin-avatar.jpg',
  },
];

async function upsertDonation(seed: SeedDonation): Promise<void> {
  const donationRepo = dataSource.getRepository(Donation);
  const userRepo = dataSource.getRepository(User);
  const categoryRepo = dataSource.getRepository(Category);
  const attachmentRepo = dataSource.getRepository(Attachment);

  const donor = await userRepo.findOne({ where: { email: seed.donorEmail } });
  if (!donor) {
    process.stderr.write(
      `[seed-donations] Skipping "${seed.title}": donor "${seed.donorEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  const category = await categoryRepo.findOne({
    where: { name: seed.categoryName },
  });
  if (!category) {
    process.stderr.write(
      `[seed-donations] Skipping "${seed.title}": category "${seed.categoryName}" not found. Run seed-categories first.\n`,
    );
    return;
  }

  let attachmentId: string | undefined;
  if (seed.attachmentFileName) {
    const attachment = await attachmentRepo.findOne({
      where: {
        fileName: seed.attachmentFileName,
        uploadedById: donor.id,
      },
    });

    if (!attachment) {
      process.stderr.write(
        `[seed-donations] "${seed.title}": attachment "${seed.attachmentFileName}" not found for donor, creating without attachment.\n`,
      );
    } else {
      attachmentId = attachment.id;
    }
  }

  const existing = await donationRepo.findOne({
    where: { userId: donor.id, title: seed.title },
  });

  if (existing) {
    donationRepo.merge(existing, {
      description: seed.description,
      quantity: seed.quantity,
      specification: seed.specification,
      expiryDate: seed.expiryDate,
      status: seed.status,
      categoryId: category.id,
      attachmentId,
    });
    await donationRepo.save(existing);
    return;
  }

  const donation = donationRepo.create({
    title: seed.title,
    description: seed.description,
    quantity: seed.quantity,
    specification: seed.specification,
    expiryDate: seed.expiryDate,
    status: seed.status,
    userId: donor.id,
    categoryId: category.id,
    attachmentId,
  });

  await donationRepo.save(donation);
}

async function seedDonations(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const donation of DONATIONS_TO_SEED) {
      await upsertDonation(donation);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedDonations()
  .then(() => {
    process.stdout.write('Donation seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Donation seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
