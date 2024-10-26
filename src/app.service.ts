import { Injectable } from '@nestjs/common';

// 앱 서비스의 기본 템플릿
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
