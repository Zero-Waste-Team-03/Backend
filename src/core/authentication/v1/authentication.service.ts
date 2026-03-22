import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  compareHash,
  generateHash,
} from 'src/common/utils/authentication/hash.utils';
import { AuthResponseDto } from './dtos/responses/auth-response.dto';
import { registerDto } from './dtos/requests/register.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import { RedisService } from 'nestjs-redis-client';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { Queue } from 'bullmq';
import { MAIL_JOBS, UPLOAD_JOBS } from 'src/common/constants/jobs';
import { v4 as uuidv4 } from 'uuid';
import authConfig from 'src/config/auth.config';
import { Profile } from 'passport-google-oauth20';
import { UserService } from 'src/core/user/v1/user.service';
import { User } from 'src/core/user/entities/user.entity';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';
import { UploadStatusValues } from 'src/common/modules/attachment/entities/attachment.entity';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface';
import { RefreshTokenPayload } from '../interfaces/refresh-token.dto';

@Injectable()
export class AuthenticationService {
  logger = new Logger(AuthenticationService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authenicationConfig: ConfigType<typeof authConfig>,

    private readonly redisService: RedisService,
    private readonly attachmentService: AttachmentService,
    @InjectQueue(QUEUE_NAME.MAIL) private readonly mailQueue: Queue,
    @InjectQueue(QUEUE_NAME.UPLOAD) private readonly uploadQueue: Queue,
  ) {}
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findBasicAuthedUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException({ errCode: 'user_not_found' });
    }
    if (!user.isMailVerified) {
      throw new UnauthorizedException({ errCode: 'email_not_verified' });
    }
    const isPasswordValid = await compareHash(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({ errCode: 'invalid_password' });
    }
    return user;
  }
  async issueTokens(user: User): Promise<AuthResponseDto> {
    try {
<<<<<<< HEAD
      const { id, email, role } = user;
      const accessTokenPayload: AccessTokenPayload = { id, email, role };
      const refreshTokenPayload: RefreshTokenPayload = {
        id,
        email,
        role,
        refreshTokenId: uuidv4(),
=======
      const { id, email, role, resetVersion } = user;
      const accessTokenPayload = { sub: id, email, role, resetVersion };
      const refreshTokenPayload = {
        sub: id,
        email,
        role,
        resetVersion,
        type: 'refresh',
>>>>>>> 0c28f06f97e6a662ac92a1ed87b8b09f5b9b78aa
      };

      const jwtConfig = this.authenicationConfig.jwt;
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(accessTokenPayload, {
          expiresIn: jwtConfig.accessTokenExpiresIn,
          secret: jwtConfig.accessTokenSecret,
        }),
        this.jwtService.signAsync(refreshTokenPayload, {
          expiresIn: jwtConfig.refreshTokenExpiresIn,
          secret: jwtConfig.refreshTokenSecret,
        }),
      ]);

      return {
        accessToken,
        refreshToken,
        user: user,
      };
    } catch (error) {
      this.logger.error('Error issuing tokens', error);
      throw new Error('Failed to issue tokens');
    }
  }
  async registerUser(data: registerDto, otp: string) {
    const storedCode = await this.redisService.get<string>(
      `verification:${data.email}`,
    );
    if (!storedCode || storedCode !== otp) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userService.createUser(data);
    await this.redisService.del(`verification:${data.email}`);

    return {
      message: 'User registered successfully.',
    };
  }

  async logOauthUser(profile: Profile): Promise<User> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException(
        'Google account does not have a verified email address.',
      );
    }

    const existingUser = await this.userService.findByEmail(email);
    let resolvedUser: User;

    if (!existingUser) {
      const displayName =
        profile.displayName ||
        `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim();

      resolvedUser = await this.userService.createOAuthUser({
        email,
        displayName,
      });

      const googlePhotoUrl = profile.photos?.[0]?.value;
      if (googlePhotoUrl) {
        await this.pushProfilePicToQueue({
          userId: resolvedUser.id,
          pictureUrl: googlePhotoUrl,
        });
      }
      this.logger.log(`Created new OAuth user: ${email}`);
    } else {
      resolvedUser = existingUser;
      this.logger.log(`Linked existing user via OAuth: ${email}`);
    }

    return resolvedUser;
  }

  private async generateAndSetOtp(email: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(`verification:${email}`, otp, 600);
    return otp;
  }

  async sendVerificationCode(email: string) {
    const otp = await this.generateAndSetOtp(email);
    await this.mailQueue.add(MAIL_JOBS.SEND_VERIFICATION_MAIL, {
      to: email,
      code: otp,
    });

    return {
      message: 'Verification code sent successfully. Please check your email.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.passwordHash || user.passwordHash === '') {
      throw new BadRequestException(
        'Cannot reset password for OAuth users. Please log in with your provider.',
      );
    }
    const token = uuidv4();
    await this.redisService.set(`password-reset:${token}`, user.email, 600);
    await this.mailQueue.add(MAIL_JOBS.SEND_PASSWORD_RESET_MAIL, {
      to: user.email,
      token,
    });
    return {
      message:
        'Password reset email sent successfully. Please check your email.',
    };
  }

  async resetPassword(token: string, password: string) {
    const email = await this.redisService.get<string>(
      `password-reset:${token}`,
    );
    if (!email) {
      throw new BadRequestException('Invalid reset token');
    }
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.passwordHash = await generateHash(password);
    user.resetVersion += 1;
    await this.userService.updateUser(user.id, user);
    await this.redisService.del(`password-reset:${token}`);
    await this.mailQueue.add(MAIL_JOBS.SEND_PASSWORD_CHANGED_ALERT, {
      to: user.email,
    });
    return {
      message: 'Password reset successfully.',
    };
  }

  async logoutFromAllDevices(user: User) {
    user.resetVersion += 1;
    await this.userService.updateUser(user.id, user);
    return {
      message: 'Logged out from all devices successfully.',
    };
  }

  async pushProfilePicToQueue({
    userId,
    pictureUrl,
  }: {
    userId: string;
    pictureUrl: string;
  }) {
    const attachment = await this.attachmentService.createAttachment({
      fileName: `avatar_${userId}`,
      fileType: 'image/jpeg',
      fileSize: 0,
      uploadStatus: UploadStatusValues.PENDING,
      uploadedById: userId,
    });

    await this.userService.updateUserWithoutReturn(userId, {
      avatar: attachment,
    });

    await this.uploadQueue.add(
      UPLOAD_JOBS.UPLOAD_OAUTH_PROFILE_PICTURE,
      {
        pictureUrl,
        attachmentId: attachment.id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
