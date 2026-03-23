import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthenticationService } from './v1/authentication.service';
import { AuthResponseType } from './graphql/types/auth-response.type';
import { MessageResponseType } from './graphql/types/message-response.type';
import { LoginInput } from './graphql/inputs/login.input';
import { RegisterInput } from './graphql/inputs/register.input';
import { ResetPasswordInput } from './graphql/inputs/reset-password.input';
import { LocalGuard } from './guards/local.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { AccessTokenGuard } from './guards/access-token.guard';
import { USER } from './decorators/user.decorartor';
import { User } from 'src/core/user/entities/user.entity';

/**
 * GraphQL resolver for authentication operations
 *
 * Provides mutations for:
 * - User login
 * - User registration
 * - Token refresh
 * - Email verification
 * - Password reset flow
 *
 * OAuth operations remain in the REST controller
 */
@Resolver()
export class AuthenticationResolver {
  constructor(private readonly authenticationService: AuthenticationService) {}

  /**
   * Login user with email and password
   *
   * @param loginInput - Email and password credentials
   * @param user - User object populated by LocalGuard after validation
   * @returns Access token, refresh token, and user details
   *
   * @example
   * mutation {
   *   login(loginInput: {
   *     email: "user@example.com"
   *     password: "password123"
   *   }) {
   *     accessToken
   *     refreshToken
   *     user {
   *       id
   *       email
   *       isMailVerified
   *     }
   *   }
   * }
   */
  @UseGuards(LocalGuard)
  @Mutation(() => AuthResponseType, {
    description: 'Login user and issue access and refresh tokens',
  })
  async login(
    @Args('loginInput') loginInput: LoginInput,
    @USER() user: User,
  ): Promise<AuthResponseType> {
    return this.authenticationService.issueTokens(user);
  }

  /**
   * Register a new user
   *
   * @param registerInput - User registration details
   * @param otp - Verification code previously sent to email
   * @returns Success message
   *
   * @example
   * mutation {
   *   register(
   *     otp: "123456"
   *     registerInput: {
   *       displayName: "John Doe"
   *       email: "john@example.com"
   *       password: "StrongPass123!"
   *       confirmPassword: "StrongPass123!"
   *       location: {
   *         latitude: 36.7525
   *         longitude: 3.042
   *         city: "Algiers"
   *         country: "Algeria"
   *       }
   *     }
   *   }) {
   *     message
   *   }
   * }
   */
  @Mutation(() => MessageResponseType, {
    description:
      'Register a new user using a previously sent verification code, so this mutation should be called after sendVerification mutation',
  })
  async register(
    @Args('registerInput') registerInput: RegisterInput,
    @Args('otp', {
      description:
        'The value of the otp obtained from the email after calling sendVerificationMail mutatuion',
    })
    otp: string,
  ): Promise<MessageResponseType> {
    return this.authenticationService.registerUser(registerInput, otp);
  }

  /**
   * Refresh access and refresh tokens
   *
   * @param user - User object populated by RefreshTokenGuard
   * @returns New access token and refresh token
   *
   * @example
   * mutation {
   *   refreshTokens {
   *     accessToken
   *     refreshToken
   *     user {
   *       id
   *       email
   *     }
   *   }
   * }
   *
   * # HTTP Headers:
   * # Authorization: Bearer <refresh-token>
   */
  @UseGuards(RefreshTokenGuard)
  @Mutation(() => AuthResponseType, {
    description:
      'Refresh access and refresh tokens using a valid refresh token, the refresh token should be sent in the Authorization header as a Bearer token',
  })
  async refreshTokens(@USER() user: User): Promise<AuthResponseType> {
    return this.authenticationService.issueTokens(user);
  }

  /**
   * Send email verification code
   *
   * @param email - User email address
   * @returns Success message
   *
   * @example
   * mutation {
   *   sendVerification(email: "user@example.com") {
   *     message
   *   }
   * }
   */
  @Mutation(() => MessageResponseType, {
    description: 'Send verification email for registration flow',
  })
  async sendVerification(
    @Args('email') email: string,
  ): Promise<MessageResponseType> {
    return this.authenticationService.sendVerificationCode(email);
  }

  /**
   * Request password reset email
   *
   * @param email - User email address
   * @returns Success message
   *
   * @example
   * mutation {
   *   forgotPassword(email: "user@example.com") {
   *     message
   *   }
   * }
   */
  @Mutation(() => MessageResponseType, {
    description: 'Send password reset email to user',
  })
  async forgotPassword(
    @Args('email') email: string,
  ): Promise<MessageResponseType> {
    return this.authenticationService.forgotPassword(email);
  }
  @Mutation(() => MessageResponseType, {
    description: 'Delete user account permanently',
  })

  /**
   * Reset password with reset token
   *
   * @param resetPasswordInput - Reset token and new password
   * @returns Success message
   *
   * @example
   * mutation {
   *   resetPassword(resetPasswordInput: {
   *     token: "reset-token-uuid"
   *     password: "NewStrongPass123!"
   *   }) {
   *     message
   *   }
   * }
   */
  @Mutation(() => MessageResponseType, {
    description: 'Reset user password with the provided token',
  })
  async resetPassword(
    @Args('resetPasswordInput') resetPasswordInput: ResetPasswordInput,
  ): Promise<MessageResponseType> {
    return this.authenticationService.resetPassword(
      resetPasswordInput.token,
      resetPasswordInput.password,
    );
  }

  /**
   * Logout from all devices
   *
   * @param user - User object populated by AccessTokenGuard
   * @returns Success message
   */
  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType, {
    description: 'Logout from all devices by invalidating all active sessions',
  })
  logoutFromAllDevices(@USER() user: User): Promise<MessageResponseType> {
    return this.authenticationService.logoutFromAllDevices(user);
  }
  /* *
   * Change password for authenticated user
   * *
   * @param userId - ID of the authenticated user
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @param logoutFromOtherDevices - Optional flag to logout from other devices after password change
   * @returns Success message
   * */
  @UseGuards(AccessTokenGuard)
  @Mutation(() => MessageResponseType, {
    description:
      'Changes the user password by providing the current password and the new password, this is different from resetPassword mutation which is used when the user forgets their password and cannot provide the current password',
  })
  async changePassword(
    @USER('id') userId: string,
    @Args('currentPassword') currentPassword: string,
    @Args('newPassword') newPassword: string,
    @Args('logoutFromOtherDevices', {
      description:
        'If the user whishes to logout from all other devics after password changes this will eventually log out all the users up to 5 mins interval ',
      defaultValue: false,
      nullable: true,
    })
    logoutFromOtherDevices: boolean = false,
  ): Promise<MessageResponseType> {
    return this.authenticationService.changePassword(
      userId,
      currentPassword,
      newPassword,
      logoutFromOtherDevices,
    );
  }
}
