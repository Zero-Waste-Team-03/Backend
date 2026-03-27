import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/core/user/v1/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  User,
  UserRoleValues,
  UserStatusValues,
} from 'src/core/user/entities/user.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { AdminUsersArgs } from 'src/core/user/graphql/inputs/admin-users.args';

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;

  beforeEach(async () => {
    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Location), useValue: {} },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPaginatedUsers', () => {
    it('should return paginated users with no filters', async () => {
      const args: AdminUsersArgs = { page: 1, limit: 10 };
      const users = [{ id: '1', email: 'test@test.com' }];

      const queryBuilder = userRepository.createQueryBuilder();
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

    it('should apply search filter on email or displayName', async () => {
      const args: AdminUsersArgs = { page: 1, limit: 10, search: 'john' };

      const queryBuilder = userRepository.createQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getPaginatedUsers(args);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.email ILIKE :search OR user.displayName ILIKE :search)',
        { search: '%john%' },
      );
    });

    it('should apply role filter', async () => {
      const args: AdminUsersArgs = {
        page: 1,
        limit: 10,
        role: UserRoleValues.USER,
      };

      const queryBuilder = userRepository.createQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getPaginatedUsers(args);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRoleValues.USER,
      });
    });

    it('should apply status filter', async () => {
      const args: AdminUsersArgs = {
        page: 1,
        limit: 10,
        status: UserStatusValues.ACTIVE,
      };

      const queryBuilder = userRepository.createQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getPaginatedUsers(args);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        { status: UserStatusValues.ACTIVE },
      );
    });
  });

  describe('getUserStats', () => {
    it('should return correct user stats', async () => {
      // Mock count returns
      userRepository.count.mockImplementation((options?: any) => {
        if (!options || !options.where) return 100; // totalUsers
        if (
          options.where.status === UserStatusValues.ACTIVE &&
          !options.where.createdAt
        )
          return 80; // activeAccounts

        // previous month total
        if (!options.where.status && options.where.createdAt) return 80;
        // previous month active
        if (
          options.where.status === UserStatusValues.ACTIVE &&
          options.where.createdAt
        )
          return 60;

        return 0;
      });

      const result = await service.getUserStats();

      expect(result).toEqual({
        totalUsers: 100,
        totalUsersIncrease: 25, // (100 - 80) / 80 * 100
        activeAccounts: 80,
        activeAccountsIncrease: 33.33, // (80 - 60) / 60 * 100
        reportedIssues: 0,
        reportedIssuesIncrease: 0,
      });
    });
  });
});
