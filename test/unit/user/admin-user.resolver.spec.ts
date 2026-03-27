import { Test, TestingModule } from '@nestjs/testing';
import { AdminUserResolver } from '../../../src/core/user/admin-user.resolver';
import { UserService } from '../../../src/core/user/v1/user.service';
import { AdminUsersArgs } from '../../../src/core/user/graphql/inputs/admin-users.args';

describe('AdminUserResolver', () => {
  let resolver: AdminUserResolver;
  let userService: {
    getPaginatedUsers: jest.Mock;
    getUserStats: jest.Mock;
  };

  beforeEach(async () => {
    userService = {
      getPaginatedUsers: jest.fn(),
      getUserStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserResolver,
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    resolver = module.get<AdminUserResolver>(AdminUserResolver);
  });

  describe('adminGetUsers', () => {
    it('should return paginated users', async () => {
      const args: AdminUsersArgs = { page: 1, limit: 10 };
      const expectedResult = { items: [], totalCount: 0 };

      userService.getPaginatedUsers.mockResolvedValue(expectedResult);

      const result = await resolver.adminGetUsers(args);

      expect(userService.getPaginatedUsers).toHaveBeenCalledWith(args);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('adminGetUserStats', () => {
    it('should return user stats', async () => {
      const expectedResult = { totalUsers: 100, activeAccounts: 80 };

      userService.getUserStats.mockResolvedValue(expectedResult);

      const result = await resolver.adminGetUserStats();

      expect(userService.getUserStats).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});
