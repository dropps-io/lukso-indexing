import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import Redis from 'ioredis';

import { REDIS_KEY } from './redis-keys';
import { REDIS_URI } from '../globals';

@Injectable()
export class RedisService implements OnModuleDestroy {
  protected client: Redis;
  protected logger: winston.Logger;

  constructor(protected readonly loggerService: LoggerService) {
    this.logger = loggerService.getChildLogger('RedisService');
    this.client = new Redis(REDIS_URI);
  }

  onModuleDestroy(): void {
    this.client.quit();
  }

  async get(key: REDIS_KEY): Promise<string | null> {
    return this.client.get(key);
  }

  async getNumber(key: REDIS_KEY): Promise<number | null> {
    const value = await this.client.get(key);
    if (value) return parseInt(value);
    else return null;
  }

  async set(key: REDIS_KEY, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  async setNumber(key: REDIS_KEY, value: number): Promise<void> {
    await this.client.set(key, value.toString());
  }

  async reset(): Promise<void> {
    await this.client.flushall();
  }
}