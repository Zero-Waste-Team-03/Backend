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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationResolver,
        { provide: AuthenticationService, useValue: authService },
      ],
    }).compile();

    resolver = module.get<AuthenticationResolver>(AuthenticationResolver);
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
  });
});
