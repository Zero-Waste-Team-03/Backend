import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'nestjs-redis-client';
import { LoginAttemptService } from 'src/core/authentication/services/login-attempt.service';
import authConfig from 'src/config/auth.config';

describe('LoginAttemptService', () => {
  let service: LoginAttemptService;
  let redisClient: { incr: jest.Mock; expire: jest.Mock };
  let redisService: {
    ttl: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    getClient: jest.Mock;
  };

  const mockConfig = {
    loginLockout: { maxAttempts: 5, lockoutSeconds: 900 },
  };

  beforeEach(async () => {
    redisClient = {
      incr: jest.fn(),
      expire: jest.fn(),
    };
    redisService = {
      ttl: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue(redisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginAttemptService,
        { provide: RedisService, useValue: redisService },
        { provide: authConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<LoginAttemptService>(LoginAttemptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAccountLocked', () => {
    it('should return locked=true with remaining seconds when key exists', async () => {
      redisService.ttl.mockResolvedValue(740);

      const result = await service.isAccountLocked('user@example.com');

      expect(result).toEqual({ locked: true, remainingSeconds: 740 });
      expect(redisService.ttl).toHaveBeenCalledWith(
        'auth:login_locked:user@example.com',
      );
    });

    it('should return locked=false when no lock key exists (ttl <= 0)', async () => {
      redisService.ttl.mockResolvedValue(-2);

      const result = await service.isAccountLocked('user@example.com');

      expect(result).toEqual({ locked: false, remainingSeconds: 0 });
    });

    it('should return locked=false when lock key has no ttl (ttl = -1)', async () => {
      redisService.ttl.mockResolvedValue(-1);

      const result = await service.isAccountLocked('user@example.com');

      expect(result).toEqual({ locked: false, remainingSeconds: 0 });
    });
  });

  describe('recordFailedAttempt', () => {
    it('should set initial expiry on first attempt', async () => {
      redisClient.incr.mockResolvedValue(1);

      await service.recordFailedAttempt('user@example.com');

      expect(redisClient.incr).toHaveBeenCalledWith(
        'auth:login_attempts:user@example.com',
      );
      expect(redisClient.expire).toHaveBeenCalledWith(
        'auth:login_attempts:user@example.com',
        900 + 3600,
      );
    });

    it('should not set expiry on subsequent attempts', async () => {
      redisClient.incr.mockResolvedValue(3);

      await service.recordFailedAttempt('user@example.com');

      expect(redisClient.incr).toHaveBeenCalledWith(
        'auth:login_attempts:user@example.com',
      );
      expect(redisClient.expire).not.toHaveBeenCalled();
    });

    it('should set lock key and delete attempts key when max attempts reached', async () => {
      redisClient.incr.mockResolvedValue(5);

      await service.recordFailedAttempt('user@example.com');

      expect(redisService.set).toHaveBeenCalledWith(
        'auth:login_locked:user@example.com',
        '1',
        900,
      );
      expect(redisService.del).toHaveBeenCalledWith(
        'auth:login_attempts:user@example.com',
      );
    });

    it('should set lock key when attempts exceed max', async () => {
      redisClient.incr.mockResolvedValue(7);

      await service.recordFailedAttempt('user@example.com');

      expect(redisService.set).toHaveBeenCalledWith(
        'auth:login_locked:user@example.com',
        '1',
        900,
      );
      expect(redisService.del).toHaveBeenCalledWith(
        'auth:login_attempts:user@example.com',
      );
    });

    it('should not set lock key when attempts are below max', async () => {
      redisClient.incr.mockResolvedValue(4);

      await service.recordFailedAttempt('user@example.com');

      expect(redisService.set).not.toHaveBeenCalled();
      expect(redisService.del).not.toHaveBeenCalled();
    });
  });

  describe('resetAttempts', () => {
    it('should delete both attempts and locked keys', async () => {
      await service.resetAttempts('user@example.com');

      expect(redisService.del).toHaveBeenCalledWith(
        'auth:login_attempts:user@example.com',
      );
      expect(redisService.del).toHaveBeenCalledWith(
        'auth:login_locked:user@example.com',
      );
    });
  });
});