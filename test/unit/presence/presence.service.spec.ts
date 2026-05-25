import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'nestjs-redis-client';
import { PresenceService } from 'src/core/presence/presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  const redis = {
    hSet: jest.fn(),
    hDel: jest.fn(),
    hGetAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: RedisService,
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('markOnline writes a future expiry on the user hash', async () => {
    redis.hSet.mockResolvedValue(1);

    await service.markOnline('u-1', 'sock-A');

    const expectedExpiry = String(Date.now() + PresenceService.TTL_MS);
    expect(redis.hSet).toHaveBeenCalledWith(
      'presence:user:u-1',
      'sock-A',
      expectedExpiry,
    );
  });

  it('heartbeat refreshes the same field with a new expiry', async () => {
    redis.hSet.mockResolvedValue(1);

    await service.heartbeat('u-1', 'sock-A');

    expect(redis.hSet).toHaveBeenCalledWith(
      'presence:user:u-1',
      'sock-A',
      String(Date.now() + PresenceService.TTL_MS),
    );
  });

  it('markOffline removes the socket field', async () => {
    redis.hDel.mockResolvedValue(1);

    await service.markOffline('u-1', 'sock-A');

    expect(redis.hDel).toHaveBeenCalledWith('presence:user:u-1', 'sock-A');
  });

  it('areOnline filters expired entries and preserves input order', async () => {
    const now = Date.now();
    redis.hGetAll.mockImplementation(async (key: string) => {
      if (key === 'presence:user:online-user') {
        return { s1: String(now + 5_000) };
      }
      if (key === 'presence:user:expired-user') {
        return { s2: String(now - 1_000) };
      }
      if (key === 'presence:user:mixed') {
        return { s3: String(now - 1_000), s4: String(now + 5_000) };
      }
      return {};
    });

    const result = await service.areOnline([
      'expired-user',
      'online-user',
      'mixed',
      'unknown-user',
    ]);

    expect(result).toEqual([false, true, true, false]);
    expect(redis.hGetAll).toHaveBeenCalledTimes(4);
  });
});
