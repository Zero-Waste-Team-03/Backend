export interface RefreshTokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  type: string;
  resetVersion: number;
  iat?: number;
  exp?: number;
}
