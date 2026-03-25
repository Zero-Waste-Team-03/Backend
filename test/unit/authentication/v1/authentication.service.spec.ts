import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthenticationService } from 'src/core/authentication/v1/authentication.service';
import { UserService } from 'src/core/user/v1/user.service';
import { JwtService } from '@nestjs/jwt';
import authConfig from 'src/config/auth.config';
import { RedisService } from 'nestjs-redis-client';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: {
    createUser: jest.Mock;
  };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let mailQueue: {
    add: jest.Mock;
  };

  beforeEach(async () => {
    userService = {
      createUser: jest.fn(),
    };
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    mailQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: {} },
        {
          provide: authConfig.KEY,
          useValue: {
            jwt: {
              accessTokenExpiresIn: '1h',
              accessTokenSecret: 'access-secret',
              refreshTokenExpiresIn: '7d',
              refreshTokenSecret: 'refresh-secret',
            },
          },
        },
        { provide: RedisService, useValue: redisService },
        { provide: AttachmentService, useValue: {} },
        { provide: getQueueToken(QUEUE_NAME.MAIL), useValue: mailQueue },
        { provide: getQueueToken(QUEUE_NAME.UPLOAD), useValue: {} },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers user when OTP is valid', async () => {
    const data = {
      email: 'user@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
      displayName: 'John Doe',
      location: {
        city: 'Algiers',
      },
    };

    redisService.get.mockResolvedValue('123456');
    userService.createUser.mockResolvedValue({ id: 'user-id' });

    const result = await service.registerUser(data, '123456');

    expect(redisService.get).toHaveBeenCalledWith(
      'verification:user@example.com',
    );
    expect(userService.createUser).toHaveBeenCalledWith(data);
    expect(redisService.del).toHaveBeenCalledWith(
      'verification:user@example.com',
    );
    expect(result).toEqual({ message: 'User registered successfully.' });
  });

  it('throws when OTP is invalid during register', async () => {
    const data = {
      email: 'user@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
      location: {
        city: 'Algiers',
      },
    };

    redisService.get.mockResolvedValue('654321');

    await expect(service.registerUser(data, '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userService.createUser).not.toHaveBeenCalled();
    expect(redisService.del).not.toHaveBeenCalled();
  });

  it('sends verification code to email', async () => {
    await service.sendVerificationCode('user@example.com');

    expect(redisService.set).toHaveBeenCalledTimes(1);
    expect(redisService.set).toHaveBeenCalledWith(
      'verification:user@example.com',
      expect.stringMatching(/^\d{6}$/),
      600,
    );
    expect(mailQueue.add).toHaveBeenCalledWith(
      'send-verification-mail',
      expect.objectContaining({
        to: 'user@example.com',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        code: expect.stringMatching(/^\d{6}$/),
      }),
    );
  });
});
