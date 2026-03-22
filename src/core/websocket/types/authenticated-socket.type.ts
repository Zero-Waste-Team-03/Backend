import { Socket } from 'socket.io';
import { AccessTokenPayload } from 'src/core/authentication/interfaces/access-token-payload.interface';

export type AuthenticatedSocket = Socket & {
  user: AccessTokenPayload;
};
