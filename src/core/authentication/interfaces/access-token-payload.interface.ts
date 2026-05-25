import { UserRole } from 'src/core/user/entities/user.entity';

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isFoodSaver: boolean;
  resetVersion: number;
  stateVersion?: number;
}
