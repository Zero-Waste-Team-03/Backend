import { StrategyOptions as StrategyOptionsGoogle } from 'passport-google-oauth20';

export interface AuthConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  };
  oauth: {
    google: StrategyOptionsGoogle;
  };
}
