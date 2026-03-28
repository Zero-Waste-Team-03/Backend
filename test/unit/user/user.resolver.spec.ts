import { Test, TestingModule } from '@nestjs/testing';
import { UserResolver } from 'src/core/user/user.resolver';
import { UserService } from 'src/core/user/v1/user.service';
import { User } from 'src/core/user/entities/user.entity';
import { AccessTokenGuard } from 'src/core/authentication/guards/access-token.guard';
import { UpdateProfileInput } from 'src/core/authentication/graphql/inputs/update-profile.input';
import { ChangePasswordInput } from 'src/core/user/graphql/inputs/change-password.input';
import { UserSettingsDto } from 'src/core/user/v1/dto/user-settings.dto';

describe('UserResolver', () => {
  let resolver: UserResolver;
  let userService: jest.Mocked<UserService>;

  const mockUser = {
    id: 'u1',
    email: 'test@example.com',
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<UserResolver>(UserResolver);
    userService = module.get(UserService);
  });

  describe('currentUser', () => {
    it('should return the current user profile', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await resolver.currentUser(mockUser);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should call userService.updateUser with correct data', async () => {
      const input: UpdateProfileInput = {
        displayName: 'New Name',
        settings: { appearance: 'Dark' } as unknown as UserSettingsDto,
      };
      userService.updateUser.mockResolvedValue({
        ...mockUser,
        ...input,
      } as unknown as User);

      const result = await resolver.updateProfile(input, mockUser);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userService.updateUser).toHaveBeenCalledWith(mockUser.id, input);
      expect(result.displayName).toBe('New Name');
    });
  });

  describe('changePassword', () => {
    it('should call userService.changePassword', async () => {
      const input: ChangePasswordInput = {
        oldPassword: 'old',
        newPassword: 'new-123',
      };
      userService.changePassword.mockResolvedValue({ message: 'Success' });

      const result = await resolver.changePassword(input, mockUser);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        input,
      );
      expect(result.message).toBe('Success');
    });
  });

  describe('deleteAccount', () => {
    it('should call userService.deleteUser', async () => {
      userService.deleteUser.mockResolvedValue({ message: 'Deleted' });

      const result = await resolver.deleteAccount(mockUser);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userService.deleteUser).toHaveBeenCalledWith(mockUser.id);
      expect(result.message).toBe('Deleted');
    });
  });
});
