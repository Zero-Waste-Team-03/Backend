import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface';
import authConfig from 'src/config/auth.config';
import { RedisService } from 'nestjs-redis-client';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'access-token',
) {
  constructor(
    @Inject(authConfig.KEY) configService: ConfigType<typeof authConfig>,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: configService.jwt.ignoreExpiration,
      secretOrKey: configService.jwt.accessTokenSecret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    const currentVersionStr = await this.redisService.get<string>(
      `user:${payload.id}:stateVersion`,
    );
    const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 0;

if (payload.stateVersion !== currentVersion) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
