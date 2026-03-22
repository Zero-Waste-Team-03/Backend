import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RefreshTokenPayload } from '../interfaces/refresh-token.dto';
import { User } from 'src/core/user/entities/user.entity';
import authConfig from 'src/config/auth.config';
import { UserService } from 'src/core/user/v1/user.service';

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
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.refreshTokenSecret,
    });
  }

  async validate(payload: RefreshTokenPayload): Promise<User | null> {
    const user = await this.userService.findById(payload.id);
    if (!user || user.resetVersion !== payload.resetVersion) {
      throw new UnauthorizedException('Refresh token invalid.');
    }
    return user;
  }
}
