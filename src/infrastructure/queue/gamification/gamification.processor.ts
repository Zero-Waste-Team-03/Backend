import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GAMIFICATION_JOBS } from 'src/common/constants/jobs';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { GamificationService } from 'src/core/gamification/gamification.service';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { NOTIFICATION_TYPE } from 'src/core/notifications/enums/notification-type.enum';
import { UserService } from 'src/core/user/v1/user.service';

type EvaluateCompletionAchievementsPayload = {
  donorId: string;
  beneficiaryId: string;
};

@Processor(QUEUE_NAME.GAMIFICATION)
export class GamificationProcessor extends WorkerHost {
  private readonly logger = new Logger(GamificationProcessor.name);

  constructor(
    private readonly gamificationService: GamificationService,
    private readonly notificationsService: NotificationsService,
    private readonly userService: UserService,
  ) {
    super();
  }

  async process(
    job: Job<EvaluateCompletionAchievementsPayload>,
  ): Promise<void> {
    if (job.name !== GAMIFICATION_JOBS.EVALUATE_COMPLETION_ACHIEVEMENTS) {
      this.logger.warn(`Unknown gamification job ${job.name}`);
      return;
    }

    const { donorId, beneficiaryId } = job.data;

    const achievements =
      await this.gamificationService.evaluateAndAwardCompletionBadgesWithoutManager(
        donorId,
        beneficiaryId,
      );

    for (const achievement of achievements) {
      await this.notificationsService.sendNotificationWithoutSaving(
        'New achievement unlocked',
        `You unlocked the "${achievement.badge.name}" badge.`,
        achievement.userId,
        NOTIFICATION_TYPE.NEW_ACHIEVEMENT,
        {
          action: 'achievement.open',
          badgeCode: achievement.badge.code,
          achievementId: achievement.id,
        },
      );
    }

    const { wasJustVerified } =
      await this.userService.checkAndAutoVerifyDonor(donorId);

    if (wasJustVerified) {
      await this.notificationsService.sendNotificationWithoutSaving(
        'You are now a verified user',
        'Congratulations! You completed 3 donations and your posts will now go live immediately.',
        donorId,
        NOTIFICATION_TYPE.ACCOUNT_STATUS_ALERT,
        {
          action: 'account.open',
          userId: donorId,
          status: 'verified',
        },
      );
    }

    this.logger.log('Gamification completion job processed', {
      jobId: job.id,
      donorId,
      beneficiaryId,
      awardedCount: achievements.length,
      donorAutoVerified: wasJustVerified,
    });
  }
}
