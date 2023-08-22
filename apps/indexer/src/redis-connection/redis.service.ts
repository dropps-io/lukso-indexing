import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import Redis from 'ioredis';

import { REDIS_KEY } from './redis-keys';
import { REDIS_URI, RESET_LAST_UPDATE_ON_START } from '../globals';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger: winston.Logger;

  constructor(protected readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getChildLogger('RedisService');
  }

  async onModuleInit(): Promise<void> {
    try {
      this.client = new Redis(REDIS_URI);
      // Reset LAST_UPDATE_TIMESTAMP on start if enabled (used for testing)
      this.resetLastUpdateTimestampOnStart();
    } catch (e) {
      this.logger.error('Error initializing RedisConnectionService:', e);
    }
  }

  onModuleDestroy(): void {
    this.client.quit();
  }

  // helper function to reset last update timestamp on start if enabled
  private async resetLastUpdateTimestampOnStart(): Promise<void> {
    if (RESET_LAST_UPDATE_ON_START) {
      await this.clearDataByKey(REDIS_KEY.LAST_UPDATE_TIMESTAMP);
      this.logger.info('Last update timestamp reset upon initialization.');
    }
  }

  // Get value from Redis with retries
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  // Set key-value pair in Redis with retries
  async set(key: string, value: string): Promise<string> {
    const result = await this.client.set(key, value);
    this.logger.error('Error setting key:', key);
    return result;
  }

  // Clear a key-value pair in Redis with retries
  async clearDataByKey(key: string): Promise<void> {
    this.ensureClientInitialized();
    await this.client.del(key);
    this.logger.info('Redis client data cleared at key.');
  }

  // Helper function to alert on race conditions
  private ensureClientInitialized(): void {
    if (!this.client) {
      this.logger.error('Redis client not initialized.');
    }
  }
}
