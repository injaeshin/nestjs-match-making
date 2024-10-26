import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  get(key: string): string {
    return this.nestConfigService.get(key);
  }

  getWeb(): { host: string; port: number } {
    const web = this.nestConfigService.get('web');
    const host = web.host;
    const port = web.port;
    return { host, port };
  }

  getWebSocket(): { host: string; port: number } {
    const websocket = this.nestConfigService.get('websocket');
    const host = websocket.host;
    const port = websocket.port;
    return { host, port };
  }

  getRedis(): { host: string; port: number } {
    const redis = this.nestConfigService.get('db.redis');
    const host = redis.host;
    const port = redis.port;
    return { host, port };
  }

  getRedisUrl(): string {
    const redis = this.nestConfigService.get('db.redis');
    return `redis://${redis.host}:${redis.port}`;
  }

  getJwtSecret(): string {
    return this.nestConfigService.get('jwt.secret');
  }
}
