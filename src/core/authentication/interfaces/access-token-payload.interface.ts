import { UserRole } from 'src/core/user/entities/user.entity';

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: UserRole;
}
