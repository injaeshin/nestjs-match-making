import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { UserModule } from 'src/user/user.module';
import { RedisModule } from 'src/data/redis.module';

import { MatchGateway } from './match.gateway';
import { MatchProcessor } from './match.processor';
import { MatchService } from './match.service';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: 'matchQueue',
    }),
    UserModule,
  ],
  controllers: [],
  providers: [MatchGateway, MatchService, MatchProcessor],
})
export class MatchModule {}
