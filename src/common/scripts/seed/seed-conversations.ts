import dataSource from 'src/infrastructure/db/data-source';
import {
  Conversation,
  ConversationStatusValues,
} from 'src/core/chat/entities/conversation.entity';
import {
  Reservation,
  ReservationStatusValues,
} from 'src/core/reservation/entities/reservation.entity';
import { Donation } from 'src/core/donation/entities/donation.entity';
import { User } from 'src/core/user/entities/user.entity';

type SeedConversation = {
  donationTitle: string;
  donorEmail: string;
  beneficiaryEmail: string;
  lastMessage?: string | null;
};

const CONVERSATIONS_TO_SEED: SeedConversation[] = [
  {
    donationTitle: 'Fresh baguettes',
    donorEmail: 'user@gaspzero.local',
    beneficiaryEmail: 'admin@gaspzero.local',
    lastMessage: 'Reservation created. Waiting for confirmation.',
  },
  {
    donationTitle: 'Fruit crate assortment',
    donorEmail: 'admin@gaspzero.local',
    beneficiaryEmail: 'user@gaspzero.local',
    lastMessage: 'Pickup can be scheduled for this evening.',
  },
  {
    donationTitle: 'Cooked rice portions',
    donorEmail: 'organization@gaspzero.local',
    beneficiaryEmail: 'admin@gaspzero.local',
    lastMessage: 'Transaction completed successfully.',
  },
];

function resolveConversationStatus(
  reservation: Reservation,
): Conversation['status'] {
  if (reservation.status === ReservationStatusValues.CONFIRMED) {
    return ConversationStatusValues.ACTIVE;
  }

  if (
    reservation.status === ReservationStatusValues.COMPLETED ||
    reservation.status === ReservationStatusValues.CANCELLED
  ) {
    return ConversationStatusValues.ARCHIVED;
  }

  return ConversationStatusValues.LOCKED;
}

/**
 * Creates or updates one conversation linked to an existing reservation.
 */
async function upsertConversation(seed: SeedConversation): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const donationRepo = dataSource.getRepository(Donation);
  const reservationRepo = dataSource.getRepository(Reservation);
  const conversationRepo = dataSource.getRepository(Conversation);

  const [donor, beneficiary] = await Promise.all([
    userRepo.findOne({ where: { email: seed.donorEmail } }),
    userRepo.findOne({ where: { email: seed.beneficiaryEmail } }),
  ]);

  if (!donor) {
    process.stderr.write(
      `[seed-conversations] Skipping "${seed.donationTitle}": donor "${seed.donorEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  if (!beneficiary) {
    process.stderr.write(
      `[seed-conversations] Skipping "${seed.donationTitle}": beneficiary "${seed.beneficiaryEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  const donation = await donationRepo.findOne({
    where: {
      title: seed.donationTitle,
      userId: donor.id,
    },
  });

  if (!donation) {
    process.stderr.write(
      `[seed-conversations] Skipping "${seed.donationTitle}": donation not found for donor "${seed.donorEmail}". Run seed-donations first.\n`,
    );
    return;
  }

  const reservation = await reservationRepo.findOne({
    where: {
      donationId: donation.id,
      beneficiaryId: beneficiary.id,
    },
  });

  if (!reservation) {
    process.stderr.write(
      `[seed-conversations] Skipping "${seed.donationTitle}": reservation not found for beneficiary "${seed.beneficiaryEmail}". Run seed-reservations first.\n`,
    );
    return;
  }

  const existing = await conversationRepo.findOne({
    where: { reservationId: reservation.id },
  });

  const status = resolveConversationStatus(reservation);

  if (existing) {
    conversationRepo.merge(existing, {
      status,
      lastMessage: seed.lastMessage ?? null,
    });
    await conversationRepo.save(existing);
    return;
  }

  const conversation = conversationRepo.create({
    reservationId: reservation.id,
    status,
    lastMessage: seed.lastMessage ?? null,
  });

  await conversationRepo.save(conversation);
}

/**
 * Seeds conversations that map one-to-one with seeded reservations.
 */
async function seedConversations(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const conversation of CONVERSATIONS_TO_SEED) {
      await upsertConversation(conversation);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedConversations()
  .then(() => {
    process.stdout.write('Conversation seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Conversation seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
