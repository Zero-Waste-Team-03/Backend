import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationResolver } from './authentication.resolver';
import { AuthenticationService } from './v1/authentication.service';
import { ResetPasswordInput } from './graphql/inputs/reset-password.input';
import { User } from '../user/entities/user.entity';

describe('AuthenticationResolver', () => {
  let resolver: AuthenticationResolver;
  let service: {
    registerUser: jest.Mock;
    sendVerificationCode: jest.Mock;
    resetPassword: jest.Mock;
    logoutFromAllDevices: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      registerUser: jest.fn(),
      sendVerificationCode: jest.fn(),
      resetPassword: jest.fn(),
      logoutFromAllDevices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationResolver,
        {
          provide: AuthenticationService,
          useValue: service,
        },
      ],
    }).compile();

    resolver = module.get<AuthenticationResolver>(AuthenticationResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('register forwards register input and otp', async () => {
    const registerInput = {
      email: 'user@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
      location: { city: 'Algiers' },
    };
    const expectedResponse = { message: 'ok' };
    service.registerUser.mockResolvedValue(expectedResponse);

    const result = await resolver.register(registerInput, '123456');

    expect(service.registerUser).toHaveBeenCalledWith(registerInput, '123456');
    expect(result).toEqual(expectedResponse);
  });

  it('sendVerification forwards email', async () => {
    const expectedResponse = { message: 'ok' };
    service.sendVerificationCode.mockResolvedValue(expectedResponse);

    const result = await resolver.sendVerification('user@example.com');

    expect(service.sendVerificationCode).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(result).toEqual(expectedResponse);
  });

  it('resetPassword forwards token and password', async () => {
    const resetPasswordInput: ResetPasswordInput = {
      token: 'valid-token-uuid',
      password: 'NewStrongPassword123!',
    };
    const expectedResponse = { message: 'Password reset successfully.' };
    service.resetPassword.mockResolvedValue(expectedResponse);

    const result = await resolver.resetPassword(resetPasswordInput);

    expect(service.resetPassword).toHaveBeenCalledWith(
      resetPasswordInput.token,
      resetPasswordInput.password,
    );
    expect(result).toEqual(expectedResponse);
  });

  it('logoutFromAllDevices forwards user and returns message', async () => {
    const user = {
      id: 'uuid',
      email: 'test@example.com',
      resetVersion: 0,
    } as User;
    const expectedResponse = {
      message: 'Logged out from all devices successfully.',
    };
    service.logoutFromAllDevices.mockResolvedValue(expectedResponse);

    const result = await resolver.logoutFromAllDevices(user);

    expect(service.logoutFromAllDevices).toHaveBeenCalledWith(user);
    expect(result).toEqual(expectedResponse);
  });
});
