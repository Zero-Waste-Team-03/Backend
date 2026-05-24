import { Test, TestingModule } from '@nestjs/testing';
import { GamificationProcessor } from 'src/infrastructure/queue/gamification/gamification.processor';
import { GamificationService } from 'src/core/gamification/gamification.service';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { UserService } from 'src/core/user/v1/user.service';
import { Job } from 'bullmq';
import { GAMIFICATION_JOBS } from 'src/common/constants/jobs';

describe('GamificationProcessor - Food Saver Features', () => {
  let processor: GamificationProcessor;
  let gamificationService: any;
  let notificationsService: any;
  let userService: any;

  beforeEach(async () => {
    gamificationService = {
      evaluateAndAwardCompletionBadgesWithoutManager: jest.fn().mockResolvedValue([]),
    };

    notificationsService = {
      sendNotificationWithoutSaving: jest.fn(),
    };

    userService = {
      checkAndAutoVerifyDonor: jest.fn().mockResolvedValue({ wasJustVerified: false }),
      checkAndAutoPromoteFoodSaver: jest.fn().mockResolvedValue({ wasJustPromoted: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationProcessor,
        {
          provide: GamificationService,
          useValue: gamificationService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    processor = module.get<GamificationProcessor>(GamificationProcessor);
  });

  it('should process gamification job and check both donor and beneficiary for food saver promotion', async () => {
    const job = {
      id: 'job-1',
      name: GAMIFICATION_JOBS.EVALUATE_COMPLETION_ACHIEVEMENTS,
      data: {
        donorId: 'donor-1',
        beneficiaryId: 'beneficiary-1',
      },
    } as Job;

    await processor.process(job);

    expect(gamificationService.evaluateAndAwardCompletionBadgesWithoutManager).toHaveBeenCalledWith('donor-1', 'beneficiary-1');
    expect(userService.checkAndAutoVerifyDonor).toHaveBeenCalledWith('donor-1');
    
    // Check that both are evaluated for food saver promotion
    expect(userService.checkAndAutoPromoteFoodSaver).toHaveBeenCalledWith('donor-1');
    expect(userService.checkAndAutoPromoteFoodSaver).toHaveBeenCalledWith('beneficiary-1');
  });

  it('should handle unknwon job names gracefully', async () => {
    const job = {
      id: 'job-2',
      name: 'UNKNOWN_JOB',
      data: {},
    } as Job;

    await processor.process(job);

    expect(gamificationService.evaluateAndAwardCompletionBadgesWithoutManager).not.toHaveBeenCalled();
    expect(userService.checkAndAutoPromoteFoodSaver).not.toHaveBeenCalled();
  });
});
