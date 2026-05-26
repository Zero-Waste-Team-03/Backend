import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/core/user/v1/user.service';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  User,
  UserRoleValues,
  UserStatusValues,
} from 'src/core/user/entities/user.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { UserSettings } from 'src/core/user/entities/user-settings.entity';
import { AdminUsersArgs } from 'src/core/user/graphql/inputs/admin-users.args';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { getQueueToken } from '@nestjs/bullmq';
import appConfig from 'src/config/app.config';
import { AdminCreateAccountInput } from 'src/core/user/graphql/inputs/admin-create-account.input';
import { MAIL_JOBS } from 'src/common/constants/jobs';
import * as hashUtils from 'src/common/utils/authentication/hash.utils';
import { EntityNotFoundError } from 'typeorm';
import { Report } from 'src/core/reporting/entities/report.entity';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { Donation } from 'src/core/donation/entities/donation.entity';
import { RedisService } from 'nestjs-redis-client';

describe('UserService', () => {
  let service: UserService;

  let userRepository: {
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
    findAndCount: jest.Mock;
    findOneBy: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let userSettingsRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let mailQueue: {
    add: jest.Mock;
  };
  let attachmentService: {
    getAttachmentById: jest.Mock;
  };
  let reportRepository: {
    createQueryBuilder: jest.Mock;
  };
  let notificationsService: {
    sendNotification: jest.Mock;
  };

  type MockQueryBuilder = {
    where: jest.Mock;
    andWhere: jest.Mock;
    orWhere: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    orderBy: jest.Mock;
    getManyAndCount: jest.Mock;
    leftJoinAndSelect: jest.Mock;
  };

  beforeEach(async () => {
    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      count: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      create: jest.fn().mockImplementation((dto) => dto),
    };

    userSettingsRepository = {
      //eslint-disable-next-line
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };

    mailQueue = {
      add: jest.fn(),
    };

    attachmentService = {
      getAttachmentById: jest.fn(),
    };

    reportRepository = {
      createQueryBuilder: jest.fn(),
    };

    notificationsService = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Location), useValue: {} },
        {
          provide: getRepositoryToken(UserSettings),
          useValue: userSettingsRepository,
        },
        {
          provide: getRepositoryToken(Report),
          useValue: reportRepository,
        },
        {
          provide: getRepositoryToken(Donation),
          useValue: { count: jest.fn().mockResolvedValue(0) },
        },
        {
          provide: appConfig.KEY,
          useValue: { frontUrl: 'http://localhost:3000' },
        },
        {
          provide: getQueueToken(QUEUE_NAME.MAIL),
          useValue: mailQueue,
        },
        {
          provide: AttachmentService,
          useValue: attachmentService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPaginatedUsers', () => {
    it('should return paginated users with no filters using queryBuilder', async () => {
      const args: AdminUsersArgs = { page: 1, limit: 10 };
      const users = [{ id: '1', email: 'test@test.com' }];

      const queryBuilder =
        userRepository.createQueryBuilder() as MockQueryBuilder;
      queryBuilder.getManyAndCount.mockResolvedValue([users, 1]);

      const result = await service.getPaginatedUsers(args);

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        items: users,
        totalCount: 1,
        page: 1,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should apply search filter using queryBuilder', async () => {
      const args: AdminUsersArgs = { page: 1, limit: 10, search: 'john' };

      const queryBuilder =
        userRepository.createQueryBuilder() as MockQueryBuilder;
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getPaginatedUsers(args);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        '(user.email ILIKE :search OR user.displayName ILIKE :search)',
        { search: '%john%' },
      );
    });

    it('should apply role filter using queryBuilder when no search', async () => {
      const args: AdminUsersArgs = {
        page: 1,
        limit: 10,
        role: UserRoleValues.USER,
      };

      const queryBuilder =
        userRepository.createQueryBuilder() as MockQueryBuilder;
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getPaginatedUsers(args);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRoleValues.USER,
      });
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply status filter using queryBuilder when no search', async () => {
      const args: AdminUsersArgs = {
        page: 1,
        limit: 10,
        status: UserStatusValues.ACTIVE,
      };

      const queryBuilder =
        userRepository.createQueryBuilder() as MockQueryBuilder;
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getPaginatedUsers(args);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        {
          status: UserStatusValues.ACTIVE,
        },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply role and status filters with search using queryBuilder', async () => {
      const args: AdminUsersArgs = {
        page: 1,
        limit: 10,
        search: 'john',
        role: UserRoleValues.USER,
        status: UserStatusValues.ACTIVE,
      };

      const queryBuilder =
        userRepository.createQueryBuilder() as MockQueryBuilder;
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getPaginatedUsers(args);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRoleValues.USER,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        {
          status: UserStatusValues.ACTIVE,
        },
      );
    });
  });

  describe('getUserStats', () => {
    it('should return correct user stats', async () => {
      const reportCurrentMonthQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(12),
      };
      const reportPreviousMonthQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(8),
      };

      reportRepository.createQueryBuilder
        .mockReturnValueOnce(reportCurrentMonthQb)
        .mockReturnValueOnce(reportPreviousMonthQb);

      userRepository.count.mockImplementation(
        (options?: { where?: Record<string, any> }) => {
          if (!options || !options.where) return 100; // totalUsers
          if (
            options.where.status === UserStatusValues.ACTIVE &&
            !options.where.createdAt
          )
            return 80; // activeAccounts

          if (!options.where.status && options.where.createdAt) return 80;
          if (
            options.where.status === UserStatusValues.ACTIVE &&
            options.where.createdAt
          )
            return 60;
          return 0;
        },
      );

      const result = await service.getUserStats();

      expect(result).toEqual({
        totalUsers: 100,
        totalUsersIncrease: 25, // (100 - 80) / 80 * 100
        activeAccounts: 80,
        activeAccountsIncrease: 33.33, // (80 - 60) / 60 * 100
        reportedIssues: 12,
        reportedIssuesIncrease: 50,
      });
    });
  });

  describe('suspendUser', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.suspendUser('missing-user')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should return existing user when already suspended', async () => {
      const user = {
        id: 'u1',
        status: UserStatusValues.SUSPENDED,
      } as User;
      userRepository.findOneBy.mockResolvedValue(user);

      const result = await service.suspendUser('u1');

      expect(result).toBe(user);
      expect(result.status).toBe(UserStatusValues.SUSPENDED);
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should update status to suspended and persist user', async () => {
      const user = { id: 'u1', status: UserStatusValues.ACTIVE } as User;
      userRepository.findOneBy.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      const result = await service.suspendUser('u1');

      expect(result.status).toBe(UserStatusValues.SUSPENDED);
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        'Account suspended',
        'Your account has been suspended. Contact support for more details.',
        'u1',
        expect.any(String),
        expect.objectContaining({
          userId: 'u1',
          status: UserStatusValues.SUSPENDED,
        }),
      );
    });
  });

  describe('activateUser', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.activateUser('missing-user')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should return existing user when already active', async () => {
      const user = { id: 'u1', status: UserStatusValues.ACTIVE } as User;
      userRepository.findOneBy.mockResolvedValue(user);

      const result = await service.activateUser('u1');

      expect(result).toBe(user);
      expect(result.status).toBe(UserStatusValues.ACTIVE);
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should update status to active and persist user', async () => {
      const user = {
        id: 'u1',
        status: UserStatusValues.SUSPENDED,
      } as User;
      userRepository.findOneBy.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      const result = await service.activateUser('u1');

      expect(result.status).toBe(UserStatusValues.ACTIVE);
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        'Account reactivated',
        'Your account has been reactivated. You can now use the platform normally.',
        'u1',
        expect.any(String),
        expect.objectContaining({
          userId: 'u1',
          status: UserStatusValues.ACTIVE,
        }),
      );
    });
  });

  describe('adminCreateAccount', () => {
    const input: AdminCreateAccountInput = {
      email: 'admin@test.com',
      displayName: 'Admin User',
      role: UserRoleValues.ADMINISTRATOR,
    };

    it('should throw BadRequestException when user already exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: '1' } as User);

      await expect(service.adminCreateAccount(input)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should create user and queue email notification', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockImplementation((user) =>
        Promise.resolve({ ...user, id: 'u1' }),
      );

      const result = await service.adminCreateAccount(input);

      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(mailQueue.add).toHaveBeenCalledWith(
        MAIL_JOBS.SEND_ACCOUNT_CREATED_MAIL,
        expect.objectContaining({
          to: input.email,
          displayName: input.displayName,
          role: input.role,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          plainPassword: expect.any(String),
          loginUrl: 'http://localhost:3000/login',
        }),
      );
      expect(result.email).toBe(input.email);
      expect(result.isVerified).toBe(true);
      expect(result.email).toBe(input.email);
      expect(result.isVerified).toBe(true);
    });
  });

  describe('updateUser', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOneOrFail.mockRejectedValue(
        new EntityNotFoundError(User, { id: 'u1' }),
      );

      await expect(
        service.updateUser('u1', { displayName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when avatar attachment is not found', async () => {
      userRepository.findOneOrFail.mockResolvedValue({ id: 'u1' } as User);
      attachmentService.getAttachmentById.mockResolvedValue(null);

      await expect(
        service.updateUser('u1', { avatarAttachmentId: 'missing-id' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update user and settings successfully', async () => {
      const existingUser = {
        id: 'u1',
        displayName: 'Old Name',
        settings: { id: 's1', isNewDonationsAlertsEnabled: true },
      } as unknown as User;

      userRepository.findOneOrFail.mockResolvedValue(existingUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      const updateData = {
        displayName: 'New Name',
        settings: { isNewDonationsAlertsEnabled: false },
      };

      const result = await service.updateUser('u1', updateData);

      expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'u1' },
        relations: ['location', 'settings'],
      });
      expect(result.displayName).toBe('New Name');
      expect(result.settings.isNewDonationsAlertsEnabled).toBe(false);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'New Name',
        }),
      );
    });
  });

  describe('changePassword', () => {
    const passwordInput = {
      oldPassword: 'old-password',
      newPassword: 'new-password-123',
    };

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.changePassword('u1', passwordInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when old password is wrong', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u1',
        passwordHash: 'hashed-old-password',
      } as User);

      jest.spyOn(hashUtils, 'compareHash').mockResolvedValue(false);

      await expect(service.changePassword('u1', passwordInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update password and lastChangedPasswordDate', async () => {
      const user = {
        id: 'u1',
        passwordHash: 'hashed-old-password',
      } as User;

      userRepository.findOne.mockResolvedValue(user);
      jest.spyOn(hashUtils, 'compareHash').mockResolvedValue(true);
      jest
        .spyOn(hashUtils, 'generateHash')
        .mockResolvedValue('hashed-new-password');
      userRepository.save.mockResolvedValue({});

      const result = await service.changePassword('u1', passwordInput);

      expect(result.message).toContain('successfully');
      expect(user.passwordHash).toBe('hashed-new-password');
      expect(user.lastChangedPasswordDate).toBeInstanceOf(Date);
      expect(userRepository.save).toHaveBeenCalledWith(user);
    });
  });
});
