import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthControler } from './auth.controller';
import { AuthGateway } from './auth.gateway';
import { UserModule } from 'src/user/user.module';
import { ConfigModule } from 'src/config/config.module';

@Module({
  imports: [UserModule, ConfigModule],
  controllers: [AuthControler],
  providers: [AuthService, AuthGateway],
  exports: [AuthService],
})
export class AuthModule {}
