import { Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserModel } from 'src/user/user.model';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async createToken(id: number, name: string): Promise<string> {
    const payload = { sub: id, name: name };
    return await this.jwtService.signAsync(payload);
  }

  async webLoginAsync(name: string): Promise<UserModel> {
    const user: UserModel = await this.userService.getUserLogin(name);
    if (!user) {
      console.log('User not found');
      return undefined;
    }

    return user;
  }

  async wsLoginAsync(client: Socket): Promise<UserModel> {
    const token = client.handshake.headers['token']?.toString();
    if (!token) {
      console.log('Not found token, disconnecting client');
      return undefined;
    }

    const decoded = await this.jwtService.verifyAsync(token);
    if (!decoded) {
      console.log('failed to authorize client');
      return undefined;
    }

    console.log('Decoded:', decoded);

    const user = await this.userService.getUserLogin(decoded.name);
    if (!user) {
      console.log('User not found');
      return undefined;
    }

    (client as any).user = user;
    user.setSocket(client);

    return user;
  }

  async wsLogoutAsync(user: UserModel) {
    return await this.userService.delUserAsync(user);
  }

  getUserByName(name: string): UserModel {
    return this.userService.getUserByName(name);
  }
}
