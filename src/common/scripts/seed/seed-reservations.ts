import dataSource from 'src/infrastructure/db/data-source';
import {
  Reservation,
  ReservationStatusValues,
} from 'src/core/reservation/entities/reservation.entity';
import {
  Donation,
  DonationStatusValues,
} from 'src/core/donation/entities/donation.entity';
import { User } from 'src/core/user/entities/user.entity';

type SeedReservation = {
  donationTitle: string;
  donorEmail: string;
  beneficiaryEmail: string;
  status: Reservation['status'];
  confirmedAt?: Date | null;
};

const RESERVATIONS_TO_SEED: SeedReservation[] = [
  {
    donationTitle: 'Fresh baguettes',
    donorEmail: 'user@gaspzero.local',
    beneficiaryEmail: 'admin@gaspzero.local',
    status: ReservationStatusValues.PENDING,
    confirmedAt: null,
  },
  {
    donationTitle: 'Fruit crate assortment',
    donorEmail: 'admin@gaspzero.local',
    beneficiaryEmail: 'user@gaspzero.local',
    status: ReservationStatusValues.CONFIRMED,
    confirmedAt: new Date(Date.now() - 1000 * 60 * 90),
  },
  {
    donationTitle: 'Cooked rice portions',
    donorEmail: 'organization@gaspzero.local',
    beneficiaryEmail: 'admin@gaspzero.local',
    status: ReservationStatusValues.COMPLETED,
    confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

function resolveDonationStatus(
  status: Reservation['status'],
): Donation['status'] {
  if (
    status === ReservationStatusValues.PENDING ||
    status === ReservationStatusValues.CONFIRMED
  ) {
    return DonationStatusValues.RESERVED;
  }

  if (status === ReservationStatusValues.COMPLETED) {
    return DonationStatusValues.COMPLETED;
  }

  return DonationStatusValues.PUBLISHED;
}

async function upsertReservation(seed: SeedReservation): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const donationRepo = dataSource.getRepository(Donation);
  const reservationRepo = dataSource.getRepository(Reservation);

  const [donor, beneficiary] = await Promise.all([
    userRepo.findOne({ where: { email: seed.donorEmail } }),
    userRepo.findOne({ where: { email: seed.beneficiaryEmail } }),
  ]);

  if (!donor) {
    process.stderr.write(
      `[seed-reservations] Skipping "${seed.donationTitle}": donor "${seed.donorEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  if (!beneficiary) {
    process.stderr.write(
      `[seed-reservations] Skipping "${seed.donationTitle}": beneficiary "${seed.beneficiaryEmail}" not found. Run seed-users first.\n`,
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
      `[seed-reservations] Skipping "${seed.donationTitle}": donation not found for donor "${seed.donorEmail}". Run seed-donations first.\n`,
    );
    return;
  }

  const existing = await reservationRepo.findOne({
    where: {
      donationId: donation.id,
      beneficiaryId: beneficiary.id,
    },
  });

  if (existing) {
    reservationRepo.merge(existing, {
      status: seed.status,
      confirmedAt: seed.confirmedAt ?? null,
    });
    await reservationRepo.save(existing);
  } else {
    const reservation = reservationRepo.create({
      donationId: donation.id,
      beneficiaryId: beneficiary.id,
      status: seed.status,
      confirmedAt: seed.confirmedAt ?? null,
    });
    await reservationRepo.save(reservation);
  }

  await donationRepo.update(donation.id, {
    status: resolveDonationStatus(seed.status),
  });
}

async function seedReservations(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const reservation of RESERVATIONS_TO_SEED) {
      await upsertReservation(reservation);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedReservations()
  .then(() => {
    process.stdout.write('Reservation seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Reservation seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
