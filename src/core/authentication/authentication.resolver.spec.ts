import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationResolver } from './authentication.resolver';
import { AuthenticationService } from './v1/authentication.service';

describe('AuthenticationResolver', () => {
  let resolver: AuthenticationResolver;
  let authService: {
    registerUser: jest.Mock;
    sendVerificationCode: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      registerUser: jest.fn(),
      sendVerificationCode: jest.fn(),
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
<<<<<<< HEAD
            { provide: AuthenticationService, useValue: authService },
=======
        {
          provide: AuthenticationService,
          useValue: mockAuthenticationService,
        },
>>>>>>> 0c28f06f97e6a662ac92a1ed87b8b09f5b9b78aa
          ],
        }).compile();

        resolver = module.get<AuthenticationResolver>(AuthenticationResolver);
<<<<<<< HEAD
      });

      it('register forwards register input and otp', async () => {
        const registerInput = {
          email: 'user@example.com',
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
          location: { city: 'Algiers' },
        };
        authService.registerUser.mockResolvedValue({ message: 'ok' });

        await resolver.register(registerInput, '123456');

        expect(authService.registerUser).toHaveBeenCalledWith(
          registerInput,
          '123456',
        );
      });

      it('sendVerification forwards email', async () => {
        authService.sendVerificationCode.mockResolvedValue({ message: 'ok' });

        await resolver.sendVerification('user@example.com');

        expect(authService.sendVerificationCode).toHaveBeenCalledWith(
          'user@example.com',
        );
=======
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
>>>>>>> 0c28f06f97e6a662ac92a1ed87b8b09f5b9b78aa
      });
    });
