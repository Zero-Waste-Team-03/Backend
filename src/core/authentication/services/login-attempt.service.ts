import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from 'nestjs-redis-client';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';

const ATTEMPTS_PREFIX = 'auth:login_attempts:';
const LOCKED_PREFIX = 'auth:login_locked:';

@Injectable()
export class LoginAttemptService {
  constructor(
    private readonly redisService: RedisService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  async isAccountLocked(
    email: string,
  ): Promise<{ locked: boolean; remainingSeconds: number }> {
    const ttl = await this.redisService.ttl(`${LOCKED_PREFIX}${email}`);
    if (ttl > 0) {
      return { locked: true, remainingSeconds: ttl };
    }
    return { locked: false, remainingSeconds: 0 };
  }

  async recordFailedAttempt(email: string): Promise<void> {
    const { maxAttempts, lockoutSeconds } = this.config.loginLockout;
    const attemptsKey = `${ATTEMPTS_PREFIX}${email}`;
    const lockedKey = `${LOCKED_PREFIX}${email}`;

    const client = this.redisService.getClient();
    const count = await client.incr(attemptsKey);

    if (count === 1) {
      await client.expire(attemptsKey, lockoutSeconds + 3600);
    }

    if (count >= maxAttempts) {
      await this.redisService.set(lockedKey, '1', lockoutSeconds);
      await this.redisService.del(attemptsKey);
    }
  }

  async resetAttempts(email: string): Promise<void> {
    await this.redisService.del(`${ATTEMPTS_PREFIX}${email}`);
    await this.redisService.del(`${LOCKED_PREFIX}${email}`);
  }
}