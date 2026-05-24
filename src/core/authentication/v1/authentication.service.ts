import { Injectable, Logger, Inject } from '@nestjs/common';
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
import { User, UserStatusValues } from 'src/core/user/entities/user.entity';
import { AttachmentService } from 'src/common/modules/attachment/attachment.service';
import { UploadStatusValues } from 'src/common/modules/attachment/entities/attachment.entity';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface';
import { RefreshTokenPayload } from '../interfaces/refresh-token.dto';
import { throwAppError } from 'src/common/errors';
import appConfig from 'src/config/app.config';

@Injectable()
export class AuthenticationService {
  logger = new Logger(AuthenticationService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authenicationConfig: ConfigType<typeof authConfig>,
    @Inject(appConfig.KEY)
    private readonly applicationConfig: ConfigType<typeof appConfig>,
    private readonly redisService: RedisService,
    private readonly attachmentService: AttachmentService,
    @InjectQueue(QUEUE_NAME.MAIL) private readonly mailQueue: Queue,
    @InjectQueue(QUEUE_NAME.UPLOAD) private readonly uploadQueue: Queue,
  ) {}
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findBasicAuthedUserByEmail(email);
    if (!user) {
      throwAppError('AUTH_INVALID_CREDENTIALS');
    }
    if (user.status == UserStatusValues.SUSPENDED) {
      throwAppError('AUTH_ACCOUNT_SUSPENDED');
    }
    const isPasswordValid = await compareHash(password, user.passwordHash);
    if (!isPasswordValid) {
      throwAppError('AUTH_INVALID_CREDENTIALS');
    }
    return user;
  }
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    logoutFromDevices: boolean = true,
  ) {
    const { passwordHash, resetVersion } =
      await this.userService.getHashedPassword(userId);
    const isCurrentPasswordValid = await compareHash(
      currentPassword,
      passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throwAppError('AUTH_INVALID_CURRENT_PASSWORD');
    }
    const newHashedPassword = await generateHash(newPassword);
    const updateData: Partial<User> = {
      passwordHash: newHashedPassword,
    };
    if (logoutFromDevices) {
      updateData.resetVersion = resetVersion + 1;
    }
    const { email } = await this.userService.updateUser(userId, updateData);
    await this.mailQueue.add(MAIL_JOBS.SEND_PASSWORD_CHANGED_ALERT, {
      to: email,
    });
    return {
      message: 'Password changed successfully.',
    };
  }
  async issueTokens(user: User): Promise<AuthResponseDto> {
    try {
      const { id, email, role, resetVersion ,isFoodSaver,isVerified} = user;
      const accessTokenPayload: AccessTokenPayload = {
        id,
        email,
        isVerified,
        isFoodSaver,
        role,
        resetVersion,
      };
      const refreshTokenPayload: RefreshTokenPayload = {
        id,
        email,
        role,
        resetVersion,
        refreshTokenId: uuidv4(),
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
      throwAppError('AUTH_INVALID_VERIFICATION_CODE');
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
      throwAppError('AUTH_OAUTH_NO_EMAIL');
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
      throwAppError('USER_NOT_FOUND');
    }
    if (!user.passwordHash || user.passwordHash === '') {
      throwAppError('AUTH_OAUTH_PASSWORD_RESET');
    }
    const token = uuidv4();
    await this.redisService.set(`password-reset:${token}`, user.email, 600);
    await this.mailQueue.add(MAIL_JOBS.SEND_PASSWORD_RESET_MAIL, {
      to: user.email,
      token,
      frontUrl: this.applicationConfig.frontUrl,
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
      throwAppError('AUTH_INVALID_RESET_TOKEN');
    }
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throwAppError('USER_NOT_FOUND');
    }
    user.passwordHash = await generateHash(password);
    user.resetVersion += 1;
    await this.userService.updateUser(user.id, user);
    await this.redisService.del(`password-reset:${token}`);
    await this.mailQueue.add(MAIL_JOBS.SEND_PASSWORD_CHANGED_ALERT, {
      to: user.email,
      frontUrl: this.applicationConfig.frontUrl,
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
      avatarAttachmentId: attachment.id,
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
