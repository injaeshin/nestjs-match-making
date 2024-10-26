import { EventEmitter2 } from '@nestjs/event-emitter';
import { Process, Processor } from '@nestjs/bull';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { RedisService } from 'src/data/redis.service';
import { UserService } from 'src/user/user.service';
import { MatchStatus } from 'src/common/enums';
import { UserModel } from 'src/user/user.model';

@Processor('matchQueue')
export class MatchProcessor {
  constructor(
    @InjectQueue('matchQueue') private readonly matchQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  private readonly dataMatchaScoreRange = 50;

  @Process('userMatchProcess')
  async handleUserMatch(job: Job) {
    console.log('userMatchProcess:', job.data, new Date());
    const { userId } = job.data;

    const user = this.userService.getUserById(userId);
    if (!user || user.matchStatus !== MatchStatus.Waiting) {
      console.log(
        'Failed to find user or user is not in waiting status ',
        user?.id,
        user?.matchStatus,
      );
      return this.stopRepeatJob(job);
    }

    const targetUserId = await this.findOnlineUser(userId);
    if (!targetUserId) {
      return this.notFoundTarget(job, user);
    }

    const targetUser = this.userService.getUserById(userId);
    if (!targetUser || targetUser.matchStatus !== MatchStatus.Waiting) {
      console.log(
        'Failed to find target user or target user is not in waiting status ',
        targetUser?.id,
        targetUser?.matchStatus,
      );
    }

    return this.completeMatch(user, targetUser);
  }

  @Process('botMatchProcess')
  async handleBotMatch(job: Job) {
    console.log('botMatchProcess:', job.data);
    const { userId, score } = job.data;

    const targetUserId = await this.findUserByScore(score);
    if (!targetUserId) {
      console.log('Failed to find target user');
      this.eventEmitter.emit('match.failed', {
        userId: userId,
      });
    }

    this.eventEmitter.emit('bot.match.completed', {
      userId: userId,
      targetUserId: targetUserId,
    });

    return;
  }

  private async findUserByScore(score: number): Promise<number> {
    let retryCount = 3;
    let adjustScore = this.dataMatchaScoreRange;
    let targetUserId: number | null = null;
    do {
      targetUserId = await this.redisService.findUserByScore(
        score,
        adjustScore,
      );

      if (targetUserId) {
        break;
      }

      adjustScore += this.dataMatchaScoreRange;
    } while (--retryCount > 0);

    return targetUserId;
  }

  private async findOnlineUser(
    excludeUserId: number,
  ): Promise<number | undefined> {
    const ids = await this.redisService.getMatchWaitUserId();
    if (!ids) {
      return undefined;
    }

    //console.log('findOnlineUser:', ids);

    const index = ids.indexOf(excludeUserId);
    if (index > -1) {
      ids.splice(index, 1);
    }

    if (ids.length === 0) {
      return undefined;
    }

    const targetUserId = ids[Math.floor(Math.random() * ids.length)];
    return targetUserId;
  }

  private notFoundTarget(job: Job<any>, user: UserModel) {
    console.log(
      `not found target - ${user.id} ${new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    );

    if (this.hasReachedLimit(job)) {
      console.log('Reached limit count, stopping job');
      this.matchQueue.add('botMatchProcess', {
        userId: user.id,
        score: user.score,
      });
    }

    return { success: false };
  }

  private hasReachedLimit(job: Job<any>) {
    const limitCount = job.opts.repeat?.limit;
    const retryCount = job.opts.repeat?.count;
    return limitCount && retryCount && retryCount >= limitCount;
  }

  private async stopRepeatJob(job: Job) {
    if (job.opts.repeat && job.opts.repeat.key) {
      await this.matchQueue.removeRepeatableByKey(job.opts.repeat.key);
    }
    return { success: false };
  }

  private completeMatch(user: UserModel, targetUser: UserModel) {
    user.matchStatus = MatchStatus.Successed;
    targetUser.matchStatus = MatchStatus.Successed;

    this.eventEmitter.emit('user.match.completed', {
      userId: user.id,
      targetUserId: targetUser.id,
    });

    return { success: true };
  }
}
