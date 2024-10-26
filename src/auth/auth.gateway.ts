import { Injectable, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { AuthService } from './auth.service';
import { UserModel } from 'src/user/user.model';
import { ConfigService } from 'src/config/config.service';

@Injectable()
@WebSocketGateway()
export class AuthGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const port = this.configService.getWebSocket().port || 3001;
    this.server.listen(port);
    console.log(`WebSocket server is running on port ${port}`);
  }

  async handleConnection(client: Socket) {
    console.log('Client connected:', client.id);

    const user = await this.authService.wsLoginAsync(client);
    if (!user) {
      console.log('Failed to authorize client, disconnecting');
      client.disconnect();
      return;
    }

    client.emit('message', `Welcome, ${user.name}`);
  }

  async handleDisconnect(client: Socket) {
    const user: UserModel = (client as any).user;
    if (user) {
      await this.authService.wsLogoutAsync(user);
    }

    console.log(`Client disconnected: ${client.id}`);
  }
}
