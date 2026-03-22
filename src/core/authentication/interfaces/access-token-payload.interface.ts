import { UserRole } from 'src/core/user/entities/user.entity';

export interface AccessTokenPayload {
  sub: string; // User ID
  user: {
    id: string;
    role: UserRole;
    email: string;
  };
  resetVersion: number;
}
