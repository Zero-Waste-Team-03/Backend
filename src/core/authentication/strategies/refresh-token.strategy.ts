import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RefreshTokenPayload } from '../interfaces/refresh-token.dto';
import { User } from 'src/core/user/entities/user.entity';
import authConfig from 'src/config/auth.config';
import { UserService } from 'src/core/user/v1/user.service';
import { throwAppError } from 'src/common/errors';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    @Inject(authConfig.KEY) configService: ConfigType<typeof authConfig>,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.refreshTokenSecret,
    });
  }

  async validate(payload: RefreshTokenPayload): Promise<User | null> {
    const user = await this.userService.findById(payload.id);
    if (!user || user.resetVersion !== payload.resetVersion) {
      throwAppError('AUTH_REFRESH_TOKEN_INVALID');
    }
    return user;
  }
}
