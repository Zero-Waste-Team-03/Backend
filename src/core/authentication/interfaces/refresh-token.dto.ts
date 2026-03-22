export interface RefreshTokenPayload {
  sub: string; // User ID
  type: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  resetVersion: number;
  iat?: number;
  exp?: number;
}
