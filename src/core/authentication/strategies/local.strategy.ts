import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { User } from 'src/core/user/entities/user.entity';
import { AuthenticationService } from '../v1/authentication.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authenticationService: AuthenticationService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }
  async validate(req: Request, email: string, password: string): Promise<User> {
    const result = await this.authenticationService.validateUser(
      email,
      password,
    );
    return result;
  }
}
