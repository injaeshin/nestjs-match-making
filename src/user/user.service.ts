import { Injectable } from '@nestjs/common';
import { RedisService } from '../data/redis.service';
import { createObjectPool } from '../common/object-pool';
import { UserModel } from 'src/user/user.model';

@Injectable()
export class UserService {
  private readonly userNameMap: Map<string, number> = new Map<string, number>();
  private readonly userMap: Map<number, UserModel> = new Map<
    number,
    UserModel
  >();
  private userPool = createObjectPool<UserModel>(
    () => Promise.resolve(new UserModel()),
    (obj) => Promise.resolve(obj.clear()),
    10,
  );

  constructor(private readonly redisService: RedisService) {}

  async newUserAsync(name: string): Promise<UserModel> {
    const user = await this.userPool.acquire();
    user.id = await this.redisService.getNextUserId();
    user.name = name;
    user.score = this.generateScore();

    return user;
  }

  async delUserAsync(user: UserModel): Promise<void> {
    if (!user) {
      return;
    }

    if (this.userNameMap.has(user.name)) {
      this.userNameMap.delete(user.name);
    }

    if (this.userMap.has(user.id)) {
      this.userMap.delete(user.id);
    }

    await this.userPool.release(user);

    console.log('User deleted:', user.id);
  }

  isExistsUserByName(name: string) {
    return this.userNameMap.has(name);
  }

  getUserById(id: number): UserModel | undefined {
    if (!this.userMap.has(id)) {
      return undefined;
    }

    return this.userMap.get(id);
  }

  getUserByName(name: string): UserModel | undefined {
    const userId = this.userNameMap.get(name);
    if (!userId) {
      return undefined;
    }
    return this.userMap.get(userId);
  }

  async getUserScoreByIdFromCache(id: number): Promise<number> {
    return await this.redisService.getUserScoreById(id);
  }

  async getUserLogin(name: string): Promise<UserModel | undefined> {
    let user = this.getUserByName(name);
    if (user) {
      await this.redisService.updateUser(user);
      return user;
    }

    user = await this.createUserAsync(name);
    if (!user) {
      return undefined;
    }

    return user;
  }

  private async createUserAsync(name: string): Promise<UserModel> {
    const user = await this.newUserAsync(name);

    if (!(await this.redisService.setUser(user))) {
      console.log('Failed to set user');
      return undefined;
    }

    this.userMap.set(user.id, user);
    this.userNameMap.set(name, user.id);

    return user;
  }

  private generateScore(): number {
    const minScore = 1;
    const maxScore = 1000;
    return Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
  }
}
