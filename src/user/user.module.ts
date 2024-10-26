import { Module } from '@nestjs/common';
import { RedisModule } from '../data/redis.module';
import { UserService } from './user.service';

@Module({
  imports: [RedisModule],
  controllers: [],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
