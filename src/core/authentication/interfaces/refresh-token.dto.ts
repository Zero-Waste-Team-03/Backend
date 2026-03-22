import { UserRole } from 'src/core/user/entities/user.entity';

export interface RefreshTokenPayload {
  id: string; // User ID
  email: string; // User email
  refreshTokenId: string; // Unique identifier for the refresh token
  role: UserRole; // User role
  iat?: number; // Issued at time (optional)
  exp?: number; // Expiration time (optional)

  resetVersion: number;
}
