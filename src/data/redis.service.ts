import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { UserModel, botUsers } from 'src/user/user.model';
import { RedisKeys } from './redis.key';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectRedis() private readonly redisClient: Redis) {}

  // #region OnModuleInit, OnModuleDestroy
  async onModuleInit() {
    if (!this.redisClient.status || this.redisClient.status === 'end') {
      console.log('Connecting to Redis...');
      await this.redisClient.connect().then(() => {
        console.log('Connected to Redis');
      });
    } else {
      console.log('Already connected to Redis');
    }

    await this.redisClient.del(RedisKeys.MATCH_WAIT_ID);

    await this.initUser();
    await this.initScore();
  }

  async onModuleDestroy() {
    this.redisClient.disconnect();
  }
  // #endregion

  // #region Initialize
  private async initUser() {
    for (const user of botUsers) {
      await this.redisClient.hset(
        `user:id:${user.id}`,
        'name',
        user.name,
        'score',
        user.score.toString(),
      );

      await this.redisClient.set(`user:name:${user.name}`, user.id.toString());
    }

    await this.redisClient.set(
      RedisKeys.LAST_USER_ID,
      botUsers.length.toString(),
    );
  }

  private async initScore() {
    // const isKeyExist = await this.redisClient.exists(RedisKeys.SCORE_RANKING);
    // if (isKeyExist) {
    //   await this.redisClient.del(RedisKeys.SCORE_RANKING);
    // }

    const zaddArgs: (string | number)[] = [];
    botUsers.forEach((user) => {
      zaddArgs.push(user.score, user.id); // [score1, id1, score2, id2, ...]
    });

    await this.redisClient.zadd(RedisKeys.SCORE_RANKING, ...zaddArgs);
  }
  // #endregion

  async updateUser(user: UserModel) {
    await this.redisClient
      .hgetall(RedisKeys.USER_BY_ID(user.id))
      .then((data) => {
        user.name = data.name;
        user.score = parseInt(data.score, 10);
      });
  }

  async setUser(user: UserModel): Promise<boolean> {
    const multi = this.redisClient.multi();
    multi.hset(
      RedisKeys.USER_BY_ID(user.id),
      'name',
      user.name,
      'score',
      user.score.toString(),
    );

    multi.set(RedisKeys.USER_BY_NAME(user.name), user.id.toString());
    multi.set(RedisKeys.LAST_USER_ID, user.id.toString());

    try {
      await multi.exec();
    } catch (error) {
      await this.redisClient.del(RedisKeys.USER_BY_ID(user.id));
      await this.redisClient.del(RedisKeys.USER_BY_NAME(user.name));
      console.log('Failed to set user:', error);
      return false;
    }

    return true;
  }

  async getUserScoreById(id: number) {
    const data = await this.redisClient.hget(RedisKeys.USER_BY_ID(id), 'score');
    if (!data) {
      return -1;
    }

    return parseInt(data, 10);
  }

  async isExistsByName(name: string): Promise<boolean> {
    return !!(await this.redisClient.get(RedisKeys.USER_BY_NAME(name)));
  }

  async isExistsById(id: number): Promise<boolean> {
    return !!(await this.redisClient.hgetall(RedisKeys.USER_BY_ID(id)));
  }

  async getUserIdByName(name: string): Promise<number> {
    const id = await this.redisClient.get(RedisKeys.USER_BY_NAME(name));
    if (!id) {
      return 0;
    }

    return parseInt(id, 10);
  }

  async getNextUserId(): Promise<number> {
    const id = await this.redisClient.get(RedisKeys.LAST_USER_ID);
    return parseInt(id, 10) + 1;
  }

  async findUserByScore(
    score: number,
    adjustScore: number,
  ): Promise<number | null> {
    const candidates = await this.redisClient.zrangebyscore(
      RedisKeys.SCORE_RANKING,
      score - adjustScore,
      score + adjustScore,
    );

    if (candidates.length === 0) {
      return null;
    }

    return parseInt(
      candidates[Math.floor(Math.random() * candidates.length)],
      10,
    );
  }

  async getMatchWaitUserId(): Promise<number[] | undefined> {
    const ids = await this.redisClient.srandmember(RedisKeys.MATCH_WAIT_ID, 3);
    return ids?.map((id) => parseInt(id, 10));
  }

  async setMatchWait(userId: number): Promise<void> {
    await this.redisClient.sadd(RedisKeys.MATCH_WAIT_ID, userId);
  }

  async delMatchWait(userId: number): Promise<void> {
    await this.redisClient.srem(RedisKeys.MATCH_WAIT_ID, userId);
  }
}

//await this.deleteDataByKey('user:id:*');
//await this.deleteDataByKey('user:name:*');

// private async deleteDataByKey(key: string): Promise<void> {
//   const stream = this.redisClient.scanStream({
//     match: key, // key 시작하는 키들만 찾음
//     count: 100, // 한 번에 100개의 키씩 조회
//   });

//   stream.on('data', async (keys: string[]) => {
//     if (keys.length) {
//       const multi = this.redisClient.multi();

//       // 트랜잭션으로 삭제
//       keys.forEach((key) => {
//         multi.del(key);
//       });

//       await multi.exec(); // 트랜잭션 실행
//       console.log(`${keys.length}개의 키가 삭제되었습니다.`);
//     }
//   });
// }
