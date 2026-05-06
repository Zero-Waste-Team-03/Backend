import { Inject, Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { AccessTokenPayload } from '../authentication/interfaces/access-token-payload.interface';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/v1/user.service';
import { AuthenticatedSocket } from './types/authenticated-socket.type';
import { PresenceService } from '../presence/presence.service';

export class WsConnectionsManagerGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WsConnectionsManagerGateway.name);
  @Inject(UserService)
  private readonly userService: UserService;
  @Inject(JwtService)
  private readonly jwtService: JwtService;
  @Inject(PresenceService)
  private readonly presenceService: PresenceService;

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnect`);
    const heartbeat = client.data?.presenceHeartbeat as
      | NodeJS.Timeout
      | undefined;
    if (heartbeat) {
      clearInterval(heartbeat);
      client.data.presenceHeartbeat = undefined;
    }
    const userId = (client as AuthenticatedSocket).user?.id;
    if (userId) {
      await this.presenceService.markOffline(userId, client.id);
    }
    client.rooms.clear();
  }
  async handleConnection(client: Socket) {
    const token = this.extractTokenFromSocket(client);
    if (!token) {
      client.disconnect(true);
      this.logger.log('no AccessToken provided');
      return;
    }
    const payload = await this.validateToken(token);
    if (!payload) {
      client.disconnect();
      return;
    }
    const user = await this.validateUser(payload.id);
    if (!user) {
      client.disconnect();
      return;
    }
    const userPayload: AccessTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      resetVersion: user.resetVersion,
    };

    client['user'] = userPayload;
    //Type cast since we already attached user payload to socket
    const getuserRooms = this.getUserRoomFromSocket(
      client as AuthenticatedSocket,
    );
    await client.join(getuserRooms);

    await this.presenceService.markOnline(userPayload.id, client.id);
    client.data.presenceHeartbeat = setInterval(() => {
      void this.presenceService.heartbeat(userPayload.id, client.id);
    }, PresenceService.HEARTBEAT_MS);
  }
  getUserRoomFromSocket(client: AuthenticatedSocket): string {
    const user = client['user'];
    if (!user) {
      client.disconnect(true);
    }
    const userRoom = `user_${user.id}`;
    return userRoom;
  }
  getUserFromSocket(client: AuthenticatedSocket): AccessTokenPayload {
    return client['user'];
  }

  extractTokenFromSocket(client: Socket): string | null {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const RawToken =
      client.handshake.auth['token'] ||
      client.handshake.headers['authorization'];
    if (!RawToken) {
      return null;
    }
    if (typeof RawToken !== 'string') {
      return null;
    }

    const [claim, token] = RawToken.split(' ') || [];

    if (claim !== 'Bearer') {
      return null;
    }

    return token || null;
  }
  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userService.findById(userId);
    if (!user) {
      return null;
    }
    return user;
  }
  async validateToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      //TODO: remove this ignore expiration after tests are done
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token,{ignoreExpiration:true});
      return payload;
    } catch (e) {
      console.log(e)
      this.logger.error('Token validation error', e);
      return null;
    }
  }
}
