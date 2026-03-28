import dataSource from 'src/infrastructure/db/data-source';
import { Location } from 'src/common/locations/entities/location.entity';
import { generateHash } from 'src/common/utils/authentication/hash.utils';
import { User, UserRoleValues } from 'src/core/user/entities/user.entity';
import { UserSettings } from 'src/core/user/entities/user-settings.entity';

type SeedUser = {
  email: string;
  password: string;
  displayName: string;
  description: string;
  role: User['role'];
  reputationScore: number;
  isMailVerified: boolean;
  location: {
    latitude?: number;
    longitude?: number;
    neighborhood?: string;
    city?: string;
    country?: string;
  };
};

const BASE_USERS: SeedUser[] = [
  {
    email: 'admin@gaspzero.local',
    password: 'Admin@12345',
    displayName: 'Gasp Zero Admin',
    description: 'Platform administrator account.',
    role: UserRoleValues.ADMINISTRATOR,
    reputationScore: 1000,
    isMailVerified: true,
    location: {
      latitude: 36.7538,
      longitude: 3.0588,
      neighborhood: 'Centre',
      city: 'Algiers',
      country: 'Algeria',
    },
  },
  {
    email: 'user@gaspzero.local',
    password: 'User@12345',
    displayName: 'Gasp Zero User',
    description: 'Standard user account for local testing.',
    role: UserRoleValues.USER,
    reputationScore: 50,
    isMailVerified: true,
    location: {
      latitude: 35.6971,
      longitude: -0.6308,
      neighborhood: 'Hai El Yasmine',
      city: 'Oran',
      country: 'Algeria',
    },
  },
  {
    email: 'organization@gaspzero.local',
    password: 'Organization@12345',
    displayName: 'Gasp Zero Org',
    description: 'Organization account for QA flows.',
    role: UserRoleValues.ORGANIZATION,
    reputationScore: 240,
    isMailVerified: true,
    location: {
      latitude: 36.365,
      longitude: 6.6147,
      neighborhood: 'Ciloc',
      city: 'Constantine',
      country: 'Algeria',
    },
  },
];

function generateRandomUsers(count: number): SeedUser[] {
  const users: SeedUser[] = [];
  const roles = [
    UserRoleValues.USER,
    UserRoleValues.ADMINISTRATOR,
    UserRoleValues.ORGANIZATION,
    UserRoleValues.STORE,
    UserRoleValues.LOCAL_AUTHORITY,
  ];

  for (let i = 1; i <= count; i++) {
    const role = roles[i % roles.length];
    const prefix = role.toLowerCase().replace(/\s+/g, '-');
    users.push({
      email: `${prefix}-${i}@gaspzero.local`,
      password: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)}@12345`,
      displayName: `Gasp Zero ${role} ${i}`,
      description: `Generated ${role} account ${i}.`,
      role,
      reputationScore: Math.floor(Math.random() * 500),
      isMailVerified: Math.random() > 0.1, // 90% chance verified
      location: {
        latitude: 36 + Math.random() * 2, // Around Algeria
        longitude: 3 + Math.random() * 4,
        city: ['Algiers', 'Oran', 'Constantine', 'Annaba'][
          Math.floor(Math.random() * 4)
        ],
        country: 'Algeria',
      },
    });
  }
  return users;
}

const USERS_TO_SEED: SeedUser[] = [...BASE_USERS, ...generateRandomUsers(100)];

/**
 * Creates or updates a user seed entry and keeps location in sync.
 */
async function upsertUser(seed: SeedUser): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const locationRepository = dataSource.getRepository(Location);

  const existing = await userRepository.findOne({
    where: { email: seed.email },
    relations: { location: true, settings: true },
  });

  const passwordHash = await generateHash(seed.password);

  const locationEntity = existing?.location
    ? locationRepository.merge(existing.location, seed.location)
    : locationRepository.create(seed.location);

  const savedLocation = await locationRepository.save(locationEntity);

  if (existing) {
    const updatedUser = userRepository.merge(existing, {
      displayName: seed.displayName,
      description: seed.description,
      role: seed.role,
      reputationScore: seed.reputationScore,
      isMailVerified: seed.isMailVerified,
      passwordHash,
      location: savedLocation,
      locationId: savedLocation.id,
    });

    if (!updatedUser.settings) {
      updatedUser.settings = new UserSettings();
    }

    await userRepository.save(updatedUser);
    return;
  }

  const createdUser = userRepository.create({
    email: seed.email,
    displayName: seed.displayName,
    description: seed.description,
    role: seed.role,
    reputationScore: seed.reputationScore,
    isMailVerified: seed.isMailVerified,
    passwordHash,
    location: savedLocation,
    locationId: savedLocation.id,
  });

  await userRepository.save(createdUser);
}

/**
 * Seeds user accounts for local and QA usage.
 */
async function seedUsers(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const userSeed of USERS_TO_SEED) {
      await upsertUser(userSeed);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedUsers()
  .then(() => {
    process.stdout.write('User seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`User seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
