import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Socket } from 'socket.io';
import { Queue } from 'bull';
import { UserModel } from 'src/user/user.model';
import { UserService } from 'src/user/user.service';
import { RedisService } from 'src/data/redis.service';
import { MatchStatus, MatchType } from 'src/common/enums';

@Injectable()
export class MatchService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectQueue('matchQueue') private readonly matchQueue: Queue,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    try {
      console.log('Pinging MatchQueue client...');
      await this.matchQueue.client.ping().then((pong) => {
        console.log('MatchQueue ping:', pong);
      });
    } catch (error) {
      console.log('MatchQueue error:', error);
      return;
    }

    console.log('MatchService initialized');
  }

  onModuleDestroy() {
    console.log('MatchService destroyed');
  }

  getUserById(id: number): UserModel {
    return this.userService.getUserById(id);
  }

  async getTargetScore(id: number): Promise<number> {
    const score = await this.redisService.getUserScoreById(id);
    if (score < 0) {
      return -1;
    }

    return score;
  }

  async addMatchQueue(type: string, user: UserModel) {
    let success = false;
    switch (type) {
      case MatchType.User:
        success = await this.addUserMatchQueue(user);
        break;
      case MatchType.Bot:
        success = await this.addBotMatchQueue(user);
        break;
    }

    if (!success) {
      console.log('Failed to add to match queue');
      return false;
    }
    return true;
  }

  async addUserMatchQueue(user: UserModel) {
    const job = { userId: user.id, score: user.score };
    const jobObject = await this.matchQueue.add('userMatchProcess', job, {
      jobId: user.id.toString(),
      repeat: { every: 1000 * 3, limit: 3 },
      removeOnComplete: true,
      removeOnFail: true,
    });

    if (!jobObject || !jobObject.id) {
      console.log('Failed to add user match queue');
      return false;
    }

    return true;
  }

  async addBotMatchQueue(user: UserModel) {
    const job = { userId: user.id, score: user.score };
    const jobObject = await this.matchQueue.add('botMatchProcess', job, {
      jobId: user.id.toString(),
      removeOnComplete: true,
      removeOnFail: true,
    });

    if (!jobObject || !jobObject.id) {
      console.log('Failed to add user match queue');
      return false;
    }

    return true;
  }

  async matchBegin(user: UserModel, type: MatchType) {
    user.setStatus(MatchStatus.Waiting);
    if (type === MatchType.User) {
      await this.redisService.setMatchWait(user.id);
    }
  }

  async matchSuccess(user: UserModel) {
    user.setStatus(MatchStatus.Successed);
    await this.redisService.delMatchWait(user.id);
  }

  async matchFailed(user: UserModel) {
    user.setStatus(MatchStatus.Failed);
    await this.redisService.delMatchWait(user.id);
  }

  isValidType(type: MatchType, client: Socket): boolean {
    if (!type) {
      console.log('Invalid match type');
      client.disconnect();
      return false;
    }

    return true;
  }

  isUserValid(user: UserModel, client: Socket): boolean {
    if (!user) {
      console.log('User not found');
      client.disconnect();
      return false;
    }
    return true;
  }

  isUserInQueue(user: UserModel): boolean {
    if (user.matchStatus == MatchStatus.Waiting) {
      console.log('User status is waiting');
      return true;
    }

    return false;
  }

  getUserBySocket(client: Socket): UserModel {
    const user = (client as any).user;
    if (!user) {
      console.log('User not found in client');
      return undefined;
    }

    return user;
  }
}
