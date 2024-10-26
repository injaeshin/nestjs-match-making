import { NestFactory } from '@nestjs/core';
import { ConfigService as NestConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = app.get(NestConfigService).get('http.port');
  await app.listen(port);
}

bootstrap();
