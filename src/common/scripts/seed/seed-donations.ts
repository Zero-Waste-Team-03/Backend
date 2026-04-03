import dataSource from 'src/infrastructure/db/data-source';
import {
  Donation,
  DonationUrgencyValues,
  DonationStatusValues,
} from 'src/core/donation/entities/donation.entity';
import { User } from 'src/core/user/entities/user.entity';
import { Category } from 'src/core/category/entities/category.entity';
import { Attachment } from 'src/common/modules/attachment/entities/attachment.entity';
import { DonationPhoto } from 'src/core/donation/entities/donation-photo.entity';
import { Location } from 'src/common/locations/entities/location.entity';

type SeedDonation = {
  title: string;
  description: string;
  quantity: number;
  specification: Record<string, any>;
  expiryDate: Date;
  urgency: Donation['urgency'];
  safetyChecklistCompleted: boolean;
  listingExpiresAt?: Date;
  status: Donation['status'];
  donorEmail: string;
  categoryName: string;
  location?: {
    latitude?: number;
    longitude?: number;
    neighborhood?: string;
    city?: string;
    country?: string;
  };
  attachmentFileNames?: string[];
  mainAttachmentFileName?: string;
};

const DONATIONS_TO_SEED: SeedDonation[] = [
  {
    title: 'Fresh baguettes',
    description: 'Unsold baguettes from this morning batch.',
    quantity: 20,
    specification: { packaging: 'paper', allergens: ['gluten'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 10),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'user@gaspzero.local',
    categoryName: 'Bakery',
    location: {
      latitude: 36.7529,
      longitude: 3.0422,
      city: 'Algiers',
      country: 'Algeria',
    },
    attachmentFileNames: ['user-profile-photo.png', 'generated-file-2.png'],
    mainAttachmentFileName: 'user-profile-photo.png',
  },
  {
    title: 'Cooked rice portions',
    description: 'Prepared meal portions from event catering.',
    quantity: 12,
    specification: { requiresColdChain: true, allergens: [] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 6),
    urgency: DonationUrgencyValues.HIGH,
    safetyChecklistCompleted: false,
    status: DonationStatusValues.DRAFT,
    donorEmail: 'organization@gaspzero.local',
    categoryName: 'Cooked Meals',
    location: {
      neighborhood: 'Ciloc',
      city: 'Constantine',
      country: 'Algeria',
    },
  },
  {
    title: 'Fruit crate assortment',
    description: 'Mixed fruits close to display deadline but still consumable.',
    quantity: 8,
    specification: { items: ['apples', 'bananas', 'oranges'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 18),
    urgency: DonationUrgencyValues.MEDIUM,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 20),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'admin@gaspzero.local',
    categoryName: 'Fruits & Vegetables',
    location: {
      latitude: 36.7538,
      longitude: 3.0588,
      city: 'Algiers',
      country: 'Algeria',
    },
    attachmentFileNames: ['admin-avatar.jpg', 'generated-file-1.jpg'],
    mainAttachmentFileName: 'admin-avatar.jpg',
  },
];

async function upsertDonation(seed: SeedDonation): Promise<void> {
  const donationRepo = dataSource.getRepository(Donation);
  const userRepo = dataSource.getRepository(User);
  const categoryRepo = dataSource.getRepository(Category);
  const attachmentRepo = dataSource.getRepository(Attachment);
  const donationPhotoRepo = dataSource.getRepository(DonationPhoto);
  const locationRepo = dataSource.getRepository(Location);

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

  let locationId: string | undefined;
  if (seed.location) {
    const location = locationRepo.create(seed.location);
    const savedLocation = await locationRepo.save(location);
    locationId = savedLocation.id;
  }

  const attachmentIds: string[] = [];
  if (seed.attachmentFileNames?.length) {
    for (const fileName of seed.attachmentFileNames) {
      const attachment = await attachmentRepo.findOne({
        where: {
          fileName,
          uploadedById: donor.id,
        },
      });

      if (!attachment) {
        process.stderr.write(
          `[seed-donations] "${seed.title}": attachment "${fileName}" not found for donor, skipping this photo.\n`,
        );
        continue;
      }

      attachmentIds.push(attachment.id);
    }
  }

  let mainAttachmentId: string | undefined;
  if (seed.mainAttachmentFileName) {
    const mainAttachment = await attachmentRepo.findOne({
      where: {
        fileName: seed.mainAttachmentFileName,
        uploadedById: donor.id,
      },
    });

    if (mainAttachment && attachmentIds.includes(mainAttachment.id)) {
      mainAttachmentId = mainAttachment.id;
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
      urgency: seed.urgency,
      safetyChecklistCompleted: seed.safetyChecklistCompleted,
      listingExpiresAt: seed.listingExpiresAt,
      publishedAt:
        seed.status === DonationStatusValues.PUBLISHED ? new Date() : undefined,
      status: seed.status,
      categoryId: category.id,
      locationId,
    });
    await donationRepo.save(existing);

    await donationPhotoRepo.delete({ donationId: existing.id });
    if (attachmentIds.length) {
      const photos = attachmentIds.map((attachmentId) =>
        donationPhotoRepo.create({
          donationId: existing.id,
          attachmentId,
          isMain: attachmentId === mainAttachmentId,
        }),
      );
      await donationPhotoRepo.save(photos);
    }

    return;
  }

  const donation = donationRepo.create({
    title: seed.title,
    description: seed.description,
    quantity: seed.quantity,
    specification: seed.specification,
    expiryDate: seed.expiryDate,
    urgency: seed.urgency,
    safetyChecklistCompleted: seed.safetyChecklistCompleted,
    listingExpiresAt: seed.listingExpiresAt,
    publishedAt:
      seed.status === DonationStatusValues.PUBLISHED ? new Date() : undefined,
    status: seed.status,
    userId: donor.id,
    categoryId: category.id,
    locationId,
  });

  const savedDonation = (await donationRepo.save(donation)) as Donation;

  if (attachmentIds.length) {
    const photos = attachmentIds.map((attachmentId) =>
      donationPhotoRepo.create({
        donationId: savedDonation.id,
        attachmentId,
        isMain: attachmentId === mainAttachmentId,
      }),
    );
    await donationPhotoRepo.save(photos);
  }
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
