import { RedisService } from 'nestjs-redis-client';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from 'src/core/user/v1/user.service';
import { User } from 'src/core/user/entities/user.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { UserSettings } from 'src/core/user/entities/user-settings.entity';
import { Report } from 'src/core/reporting/entities/report.entity';
import { Donation } from 'src/core/donation/entities/donation.entity';
import appConfig from 'src/config/app.config';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { NOTIFICATION_TYPE } from 'src/core/notifications/enums/notification-type.enum';

describe('UserService - Food Saver Features', () => {
  let service: UserService;
  let userRepository: any;
  let notificationsService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    notificationsService = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserSettings),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Report),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Donation),
          useValue: {},
        },
        {
          provide: appConfig.KEY,
          useValue: { frontUrl: 'http://localhost' },
        },
        {
          provide: getQueueToken(QUEUE_NAME.MAIL),
          useValue: {},
        },
        {
          provide: AttachmentService,
          useValue: {},
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('adminUpdateUserFoodSaverStatus', () => {
    it('should update user to food saver and send notification', async () => {
      const mockUser = {
        id: 'user-1',
        isFoodSaver: false,
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({ ...mockUser, isFoodSaver: true });

      const result = await service.adminUpdateUserFoodSaverStatus('user-1', true);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 'user-1' });
      expect(mockUser.isFoodSaver).toBe(true);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        'Food Saver Status Changed',
        'Your account has been promoted to a food saver by an admin.',
        'user-1',
        NOTIFICATION_TYPE.ACCOUNT_STATUS_ALERT,
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });

    it('should not update if user already has the requested status', async () => {
      const mockUser = {
        id: 'user-1',
        isFoodSaver: true,
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);

      await service.adminUpdateUserFoodSaverStatus('user-1', true);

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('checkAndAutoPromoteFoodSaver', () => {
    it('should promote user if reputation score is >= 500 and not already a food saver', async () => {
      const mockUser = {
        id: 'user-1',
        reputationScore: 500,
        isFoodSaver: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      
      const executeMock = jest.fn().mockResolvedValue({ affected: 1 });
      const whereMock = jest.fn().mockReturnValue({ execute: executeMock });
      const setMock = jest.fn().mockReturnValue({ where: whereMock });
      const updateMock = jest.fn().mockReturnValue({ set: setMock });
      
      userRepository.createQueryBuilder.mockReturnValue({
        update: updateMock,
      });

      const result = await service.checkAndAutoPromoteFoodSaver('user-1');

      expect(result.wasJustPromoted).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(User);
      expect(setMock).toHaveBeenCalledWith({ isFoodSaver: true });
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        'Congratulations! You are now a Food Saver',
        expect.any(String),
        'user-1',
        NOTIFICATION_TYPE.ACCOUNT_STATUS_ALERT,
        expect.any(Object),
      );
    });

    it('should not promote if reputation score is < 40', async () => {
      const mockUser = {
        id: 'user-1',
        reputationScore: 39,
        isFoodSaver: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.checkAndAutoPromoteFoodSaver('user-1');

      expect(result.wasJustPromoted).toBe(false);
      expect(userRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should not promote if user is already a food saver', async () => {
      const mockUser = {
        id: 'user-1',
        reputationScore: 600,
        isFoodSaver: true,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.checkAndAutoPromoteFoodSaver('user-1');

      expect(result.wasJustPromoted).toBe(false);
      expect(userRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
