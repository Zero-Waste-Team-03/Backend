import dataSource from 'src/infrastructure/db/data-source';
import { Notification } from 'src/core/notifications/entities/notification.entity';
import {
  NOTIFICATION_TYPE,
  NotificationType,
} from 'src/core/notifications/enums/notification-type.enum';
import { NOTIFICATION_ACTION } from 'src/core/notifications/constants/notification-actions';
import { User } from 'src/core/user/entities/user.entity';
import { Donation } from 'src/core/donation/entities/donation.entity';
import { Conversation } from 'src/core/chat/entities/conversation.entity';
import { Reservation } from 'src/core/reservation/entities/reservation.entity';
import { Message } from 'src/core/chat/entities/message.entity';
import { Report } from 'src/core/reporting/entities/report.entity';
import { Achievement } from 'src/core/gamification/entities/achievement.entity';
import { Badge } from 'src/core/gamification/entities/badge.entity';

/**
 * Seeds one notification per supported `action` so the mobile/web clients can
 * exercise tap-routing end-to-end against real IDs (no synthetic uuids).
 *
 * Each seed declares an `action` plus the hints needed to look up the linked
 * entity (donation title + donor email, badge code, etc). At insert time we
 * resolve those into the actual ids and write the result into `meta`. If a
 * referenced entity is missing the seed is skipped with a clear message — run
 * the upstream seeders first (donations → reservations → conversations →
 * reports/achievements).
 */

type SeedAction =
  | {
      kind: 'chat';
      donationTitle: string;
      donorEmail: string;
      beneficiaryEmail: string;
    }
  | { kind: 'donation'; donationTitle: string; donorEmail: string }
  | {
      kind: 'reservation';
      donationTitle: string;
      donorEmail: string;
      beneficiaryEmail: string;
    }
  | { kind: 'report'; reporterEmail: string; reason: string }
  | { kind: 'account'; userEmail: string }
  | { kind: 'achievement'; userEmail: string; badgeCode: string }
  | { kind: 'default' };

type SeedNotification = {
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  /** email of the user who receives this notification */
  receiverEmail: string;
  action: SeedAction;
};

const NOTIFICATIONS_TO_SEED: SeedNotification[] = [
  // chat.open — donor gets a chat push from the beneficiary
  {
    title: 'Admin',
    body: 'Reservation created. Waiting for confirmation.',
    type: NOTIFICATION_TYPE.CHAT_MESSAGE,
    isRead: false,
    receiverEmail: 'user@gaspzero.local',
    action: {
      kind: 'chat',
      donationTitle: 'Fresh baguettes',
      donorEmail: 'user@gaspzero.local',
      beneficiaryEmail: 'admin@gaspzero.local',
    },
  },

  // reservation.open — donor notified a beneficiary reserved their donation
  {
    title: 'Donation reserved',
    body: 'Admin reserved qty of Fresh baguettes.',
    type: NOTIFICATION_TYPE.RESERVATION_ALERT,
    isRead: false,
    receiverEmail: 'user@gaspzero.local',
    action: {
      kind: 'reservation',
      donationTitle: 'Fresh baguettes',
      donorEmail: 'user@gaspzero.local',
      beneficiaryEmail: 'admin@gaspzero.local',
    },
  },

  // donation.open — generic deep-link to a donation (e.g. nearby listing)
  {
    title: 'New donation near you',
    body: 'Fruit crate assortment is available now.',
    type: NOTIFICATION_TYPE.NEW_POST,
    isRead: false,
    receiverEmail: 'user@gaspzero.local',
    action: {
      kind: 'donation',
      donationTitle: 'Fruit crate assortment',
      donorEmail: 'admin@gaspzero.local',
    },
  },

  // report.open — admin gets alerted of a fresh report
  {
    title: 'New report filed',
    body: 'A donation was reported for food safety concern.',
    type: NOTIFICATION_TYPE.REPORT_ALERT,
    isRead: false,
    receiverEmail: 'admin@gaspzero.local',
    action: {
      kind: 'report',
      reporterEmail: 'user@gaspzero.local',
      reason: 'Food safety concern',
    },
  },

  // account.open — account status change
  {
    title: 'Account verified',
    body: 'Your organization account has been verified by an administrator.',
    type: NOTIFICATION_TYPE.ACCOUNT_STATUS_ALERT,
    isRead: true,
    receiverEmail: 'organization@gaspzero.local',
    action: { kind: 'account', userEmail: 'organization@gaspzero.local' },
  },

  // achievement.open — user just unlocked a badge
  {
    title: 'New achievement unlocked',
    body: 'You unlocked the "First Pickup" badge.',
    type: NOTIFICATION_TYPE.NEW_ACHIEVEMENT,
    isRead: false,
    receiverEmail: 'user@gaspzero.local',
    action: {
      kind: 'achievement',
      userEmail: 'user@gaspzero.local',
      badgeCode: 'FIRST_PICKUP_COMPLETED',
    },
  },

  // notification.open — fallback / no specific destination
  {
    title: 'Welcome to Gasp Zero',
    body: 'Your administrator account has been set up successfully.',
    type: NOTIFICATION_TYPE.TEST,
    isRead: true,
    receiverEmail: 'admin@gaspzero.local',
    action: { kind: 'default' },
  },
];

async function resolveMeta(
  action: SeedAction,
  context: string,
): Promise<Record<string, unknown> | null> {
  const userRepo = dataSource.getRepository(User);
  const donationRepo = dataSource.getRepository(Donation);
  const reservationRepo = dataSource.getRepository(Reservation);
  const conversationRepo = dataSource.getRepository(Conversation);
  const messageRepo = dataSource.getRepository(Message);
  const reportRepo = dataSource.getRepository(Report);
  const achievementRepo = dataSource.getRepository(Achievement);
  const badgeRepo = dataSource.getRepository(Badge);

  switch (action.kind) {
    case 'chat': {
      const [donor, beneficiary] = await Promise.all([
        userRepo.findOne({ where: { email: action.donorEmail } }),
        userRepo.findOne({ where: { email: action.beneficiaryEmail } }),
      ]);
      if (!donor || !beneficiary) {
        return missing(context, 'donor/beneficiary user(s)');
      }
      const donation = await donationRepo.findOne({
        where: { title: action.donationTitle, userId: donor.id },
      });
      if (!donation) return missing(context, 'donation');
      const reservation = await reservationRepo.findOne({
        where: { donationId: donation.id, beneficiaryId: beneficiary.id },
      });
      if (!reservation) return missing(context, 'reservation');
      const conversation = await conversationRepo.findOne({
        where: { reservationId: reservation.id },
      });
      if (!conversation) return missing(context, 'conversation');
      const message = await messageRepo.findOne({
        where: { conversationId: conversation.id },
        order: { createdAt: 'DESC' },
      });
      return {
        action: NOTIFICATION_ACTION.CHAT_OPEN,
        chatId: conversation.id,
        conversationId: conversation.id,
        messageId: message?.id ?? null,
        senderId: beneficiary.id,
        senderName: beneficiary.displayName ?? null,
      };
    }

    case 'donation': {
      const donor = await userRepo.findOne({
        where: { email: action.donorEmail },
      });
      if (!donor) return missing(context, 'donor user');
      const donation = await donationRepo.findOne({
        where: { title: action.donationTitle, userId: donor.id },
      });
      if (!donation) return missing(context, 'donation');
      return {
        action: NOTIFICATION_ACTION.DONATION_OPEN,
        donationId: donation.id,
        donationTitle: donation.title,
        donorId: donor.id,
      };
    }

    case 'reservation': {
      const [donor, beneficiary] = await Promise.all([
        userRepo.findOne({ where: { email: action.donorEmail } }),
        userRepo.findOne({ where: { email: action.beneficiaryEmail } }),
      ]);
      if (!donor || !beneficiary) {
        return missing(context, 'donor/beneficiary user(s)');
      }
      const donation = await donationRepo.findOne({
        where: { title: action.donationTitle, userId: donor.id },
      });
      if (!donation) return missing(context, 'donation');
      const reservation = await reservationRepo.findOne({
        where: { donationId: donation.id, beneficiaryId: beneficiary.id },
      });
      if (!reservation) return missing(context, 'reservation');
      return {
        action: NOTIFICATION_ACTION.RESERVATION_OPEN,
        reservationId: reservation.id,
        donationId: donation.id,
        donationTitle: donation.title,
        beneficiaryName: beneficiary.displayName ?? null,
        quantity: reservation.quantity,
        status: reservation.status,
      };
    }

    case 'report': {
      const reporter = await userRepo.findOne({
        where: { email: action.reporterEmail },
      });
      if (!reporter) return missing(context, 'reporter user');
      const report = await reportRepo.findOne({
        where: { reporterId: reporter.id, reason: action.reason },
      });
      if (!report) return missing(context, 'report');
      return {
        action: NOTIFICATION_ACTION.REPORT_OPEN,
        reportId: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        status: report.status,
      };
    }

    case 'account': {
      const user = await userRepo.findOne({
        where: { email: action.userEmail },
      });
      if (!user) return missing(context, 'user');
      return {
        action: NOTIFICATION_ACTION.ACCOUNT_OPEN,
        userId: user.id,
        status: user.status,
      };
    }

    case 'achievement': {
      const [user, badge] = await Promise.all([
        userRepo.findOne({ where: { email: action.userEmail } }),
        badgeRepo.findOne({ where: { code: action.badgeCode } }),
      ]);
      if (!user || !badge) return missing(context, 'user/badge');
      const achievement = await achievementRepo.findOne({
        where: { userId: user.id, badgeId: badge.id },
      });
      if (!achievement) return missing(context, 'achievement');
      return {
        action: NOTIFICATION_ACTION.ACHIEVEMENT_OPEN,
        achievementId: achievement.id,
        badgeCode: badge.code,
      };
    }

    case 'default':
      return { action: NOTIFICATION_ACTION.DEFAULT_OPEN };
  }
}

function missing(context: string, what: string): null {
  process.stderr.write(
    `[seed-notifications] Skipping "${context}": ${what} not found. Run upstream seeders first.\n`,
  );
  return null;
}

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

  const meta = await resolveMeta(seed.action, seed.title);
  if (!meta) return;

  const existing = await notificationRepo.findOne({
    where: { title: seed.title, receiverId: receiver.id, type: seed.type },
  });

  if (existing) {
    notificationRepo.merge(existing, {
      body: seed.body,
      isRead: seed.isRead,
      meta,
    });
    await notificationRepo.save(existing);
    return;
  }

  const notification = notificationRepo.create({
    title: seed.title,
    body: seed.body,
    type: seed.type,
    isRead: seed.isRead,
    meta,
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
