export interface SendPasswordResetMailDto {
  to: string;
  token: string;
  frontUrl: string;
}
