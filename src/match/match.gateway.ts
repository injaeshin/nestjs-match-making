import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

import { UserModel } from 'src/user/user.model';
import { MatchStatus } from 'src/common/enums';
import { MatchService } from './match.service';

@Injectable()
@WebSocketGateway()
export class MatchGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly matchService: MatchService) {}

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ): Promise<void> {
    console.log('Match request:', payload);

    if (!this.matchService.isValidType(payload.type, client)) {
      this.sendMessage(client, 'Invalid type');
      return;
    }

    const user: UserModel = this.matchService.getUserBySocket(client);
    if (!this.matchService.isUserValid(user, client)) {
      return;
    }

    if (this.matchService.isUserInQueue(user)) {
      return;
    }

    if (!this.matchService.addMatchQueue(payload.type, user)) {
      return;
    }

    this.matchService.matchBegin(user, payload.type);

    this.sendMessage(
      client,
      `${user.id} / ${user.score} - added to match queue`,
    );
  }

  @OnEvent('user.match.completed')
  async handleUserMatchCompleted(data: any) {
    console.log('user match completed:', data);

    const { userId, targetUserId } = data;

    const user = this.matchService.getUserById(userId);
    if (!user) {
      console.log('user not found', userId);
      return;
    }

    if (user.matchStatus !== MatchStatus.Successed) {
      this.matchService.matchFailed(user);
      return;
    }

    const targetUser = this.matchService.getUserById(targetUserId);
    if (!targetUser) {
      this.matchService.matchFailed(user);
      this.sendMessage(user.getSocket(), 'failed to find target user');
      return;
    }

    if (targetUser.matchStatus !== MatchStatus.Successed) {
      this.matchService.matchFailed(targetUser);
      this.sendMessage(user.getSocket(), 'target user failed to match');
      return;
    }

    await this.matchService.matchSuccess(user);
    await this.matchService.matchSuccess(targetUser);

    this.sendMessage(
      user.getSocket(),
      `target - ${targetUser.id} / ${targetUser.score}`,
    );

    this.sendMessage(
      targetUser.getSocket(),
      `target - ${user.id} / ${user.score}`,
    );

    console.log(
      'Match completed:',
      user.id,
      user.score,
      targetUser.id,
      targetUser.score,
    );
  }

  @OnEvent('bot.match.completed')
  async handleBotMatchCompleted(data: any) {
    console.log('bot match completed:', data);

    const { userId, targetUserId } = data;

    const user = this.matchService.getUserById(userId);
    if (!user) {
      console.log('user not found', userId);
      return;
    }

    if (user.matchStatus !== MatchStatus.Waiting) {
      console.log('match canceled', userId);

      this.matchService.matchFailed(user);
      return;
    }

    const targetScore = await this.matchService.getTargetScore(userId);
    if (targetScore < 0) {
      console.log('Failed to get target');
      this.matchService.matchFailed(user);
      return;
    }

    await this.matchService.matchSuccess(user);

    this.sendMessage(
      user.getSocket(),
      `${userId} / ${user.score} vs ${targetUserId} / ${targetScore}`,
    );
  }

  @OnEvent('match.failed')
  async handleMatchFailed(data: any) {
    const { userId } = data;
    console.log('Match failed:', userId);

    const user = this.matchService.getUserById(userId);
    if (!user) {
      console.log('Client not found');
      return;
    }

    await this.matchService.matchFailed(user);
    this.sendMessage(user.getSocket(), 'failed to find target user');
  }

  private sendMessage(
    client: Socket,
    message: string,
    eventName: string = 'message',
  ): void {
    if (!client || !client.connected) {
      return;
    }

    client.emit(eventName, message);
  }
}
