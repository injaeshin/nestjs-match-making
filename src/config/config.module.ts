import { Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService as NestConfigService,
} from '@nestjs/config';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';

import { ConfigService } from './config.service';

@Module({
  imports: [
    NestConfigModule.forRoot({
      //isGlobal: true,
      load: [
        () => {
          const YAML_CONFIG_FILENAME = 'app.config.yml';
          return yaml.load(readFileSync(YAML_CONFIG_FILENAME, 'utf8'));
        },
      ],
    }),
  ],
  providers: [NestConfigService, ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
