import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationResolver } from './authentication.resolver';
import { AuthenticationService } from './v1/authentication.service';
import { ResetPasswordInput } from './graphql/inputs/reset-password.input';

describe('AuthenticationResolver', () => {
  let resolver: AuthenticationResolver;
  let service: AuthenticationService;

  beforeEach(async () => {
    // Mock AuthenticationService
    const mockAuthenticationService = {
      resetPassword: jest.fn(),
      logoutFromAllDevices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationResolver,
        {
          provide: AuthenticationService,
          useValue: mockAuthenticationService,
        },
      ],
    }).compile();

    resolver = module.get<AuthenticationResolver>(AuthenticationResolver);
    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('resetPassword', () => {
    it('should call authenticationService.resetPassword with correct parameters and return message', async () => {
      // Arrange
      const resetPasswordInput: ResetPasswordInput = {
        token: 'valid-token-uuid',
        password: 'NewStrongPassword123!',
      };
      const expectedResponse = { message: 'Password reset successfully.' };
      jest.spyOn(service, 'resetPassword').mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.resetPassword(resetPasswordInput);

      // Assert
      expect(service.resetPassword).toHaveBeenCalledWith(
        resetPasswordInput.token,
        resetPasswordInput.password,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('logoutFromAllDevices', () => {
    it('should call authenticationService.logoutFromAllDevices and return message', async () => {
      // Arrange
      const user = {
        id: 'uuid',
        email: 'test@example.com',
        resetVersion: 0,
      } as any;
      const expectedResponse = {
        message: 'Logged out from all devices successfully.',
      };
      jest
        .spyOn(service, 'logoutFromAllDevices')
        .mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.logoutFromAllDevices(user);

      // Assert
      expect(service.logoutFromAllDevices).toHaveBeenCalledWith(user);
      expect(result).toEqual(expectedResponse);
    });
  });
});
