
export interface SendAccountCreatedMailDto {
  to: string;
  displayName: string;
  role: string;
  plainPassword: string;
  loginUrl: string;
}
