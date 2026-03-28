import dataSource from 'src/infrastructure/db/data-source';
import { Notification } from 'src/core/notifications/entities/notification.entity';
import {
  NOTIFICATION_TYPE,
  NotificationType,
} from 'src/core/notifications/enums/notification-type.enum';
import { User } from 'src/core/user/entities/user.entity';

type SeedNotification = {
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  meta?: Record<string, unknown>;
  /** email of the user who receives this notification */
  receiverEmail: string;
};

const BASE_NOTIFICATIONS: SeedNotification[] = [
  {
    title: 'Welcome to Gasp Zero',
    body: 'Your administrator account has been set up successfully.',
    type: NOTIFICATION_TYPE.TEST,
    isRead: true,
    receiverEmail: 'admin@gaspzero.local',
  },
  {
    title: 'New reservation pending',
    body: 'User #42 requested a pickup reservation. Please review.',
    type: NOTIFICATION_TYPE.RESERVATION_ALERT,
    isRead: false,
    meta: { reservationId: 'res-001', userId: 'user-42' },
    receiverEmail: 'admin@gaspzero.local',
  },

  {
    title: 'Points earned!',
    body: 'You just earned the "First Pickup" achievement badge.',
    type: NOTIFICATION_TYPE.NEW_ACHIEVEMENT,
    isRead: false,
    meta: { achievementId: 'ach-first-pickup', points: 50 },
    receiverEmail: 'user@gaspzero.local',
  },
  {
    title: 'New message from Org',
    body: 'Gasp Zero Org sent you a message about your recent post.',
    type: NOTIFICATION_TYPE.MESSAGE,
    isRead: true,
    meta: { senderId: 'org-id-001', threadId: 'thread-007' },
    receiverEmail: 'user@gaspzero.local',
  },
  {
    title: 'New post nearby',
    body: 'A new recycling point was added in your neighborhood.',
    type: NOTIFICATION_TYPE.NEW_POST,
    isRead: false,
    meta: { postId: 'post-123', lat: 36.75, lng: 3.05 },
    receiverEmail: 'user@gaspzero.local',
  },
  {
    title: 'Reservation confirmed',
    body: 'Your pickup reservation for tomorrow has been confirmed.',
    type: NOTIFICATION_TYPE.RESERVATION_ALERT,
    isRead: false,
    meta: { reservationId: 'res-002', scheduledAt: '2026-03-29T09:00:00Z' },
    receiverEmail: 'user@gaspzero.local',
  },

  {
    title: 'Account verified',
    body: 'Your organization account has been verified by an administrator.',
    type: NOTIFICATION_TYPE.TEST,
    isRead: true,
    receiverEmail: 'organization@gaspzero.local',
  },
  {
    title: 'New message from user',
    body: 'A user sent you a message about your latest collection event.',
    type: NOTIFICATION_TYPE.MESSAGE,
    isRead: false,
    meta: { senderId: 'user-id-001', threadId: 'thread-008' },
    receiverEmail: 'organization@gaspzero.local',
  },
  {
    title: 'New post on your collection event',
    body: 'Someone commented on your recent community post.',
    type: NOTIFICATION_TYPE.NEW_POST,
    isRead: true,
    meta: { postId: 'post-456', commentId: 'cmt-789' },
    receiverEmail: 'organization@gaspzero.local',
  },
];

function generateRandomNotifications(count: number): SeedNotification[] {
  const receivers = [
    'admin@gaspzero.local',
    'user@gaspzero.local',
    'organization@gaspzero.local',
  ];
  const types = Object.values(NOTIFICATION_TYPE);

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    return {
      title: `Generated notification #${i + 1}`,
      body: `This is auto-generated notification body number ${i + 1} of type ${type}.`,
      type,
      isRead: i % 3 !== 0, // ~66 % read
      meta: { generatedIndex: i + 1 },
      receiverEmail: receivers[i % receivers.length],
    };
  });
}

const NOTIFICATIONS_TO_SEED: SeedNotification[] = [
  ...BASE_NOTIFICATIONS,
  ...generateRandomNotifications(30),
];

async function upsertNotification(seed: SeedNotification): Promise<void> {
  const notificationRepo = dataSource.getRepository(Notification);
  const userRepo = dataSource.getRepository(User);

  const receiver = await userRepo.findOne({
    where: { email: seed.receiverEmail },
  });

  if (!receiver) {
    process.stderr.write(
      `[seed-notifications] Skipping "${seed.title}": user "${seed.receiverEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  const existing = await notificationRepo.findOne({
    where: { title: seed.title, receiverId: receiver.id, type: seed.type },
  });

  if (existing) {
    notificationRepo.merge(existing, {
      body: seed.body,
      isRead: seed.isRead,
      meta: seed.meta,
    });
    await notificationRepo.save(existing);
    return;
  }

  const notification = notificationRepo.create({
    title: seed.title,
    body: seed.body,
    type: seed.type,
    isRead: seed.isRead,
    meta: seed.meta,
    receiverId: receiver.id,
  });

  await notificationRepo.save(notification);
}

async function seedNotifications(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const notification of NOTIFICATIONS_TO_SEED) {
      await upsertNotification(notification);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedNotifications()
  .then(() => {
    process.stdout.write('Notification seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Notification seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
