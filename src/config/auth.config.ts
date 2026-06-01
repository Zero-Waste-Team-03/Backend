import { registerAs } from '@nestjs/config';
import { AuthConfig } from './interfaces/auth-config.interface';

export default registerAs(
  'auth',
  (): AuthConfig => ({
    jwt: {
      ignoreExpiration: process.env.NODE_ENV === 'development' || false,
      accessTokenSecret:
        process.env.JWT_ACCESS_TOKEN_SECRET || 'defaultAccessTokenSecret',
      refreshTokenSecret:
        process.env.JWT_REFRESH_TOKEN_SECRET! || 'defaultRefreshTokenSecret',
      accessTokenExpiresIn: parseInt(
        process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '86400',
      ), // 1 day
      refreshTokenExpiresIn: parseInt(
        process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || (86400 * 7).toString(),
      ), // 7 day
    },
    oauth: {
      google: {
        clientID: process.env.GOOGLE_OAUTH_CLIENT_ID || 'defaultGoogleClientId',
        clientSecret:
          process.env.GOOGLE_OAUTH_CLIENT_SECRET || 'defaultGoogleClientSecret',
        callbackURL:
          process.env.GOOGLE_OAUTH_CALLBACK_URL ||
          'http://localhost:3000/api/v1/authentication/oauth/google/callback',
        scope: ['email', 'profile'],
      },
    },
    loginLockout: {
      maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
      lockoutSeconds: parseInt(process.env.LOGIN_LOCKOUT_SECONDS || '900', 10),
    },
  }),
);
