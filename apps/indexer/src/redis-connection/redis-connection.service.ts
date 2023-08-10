import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { retryOperation } from '@utils/retry-operation';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';

@Injectable()
export class RedisConnectionService implements OnModuleInit {
  private readonly logger: winston.Logger;
  private client: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    protected readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getChildLogger('RedisConnectionService');
  }

  // Configure RDB persistence if enabled
  private configureRdbPersistence(): void {
    if (this.configService.get<boolean>('ENABLE_RDB_PERSISTENCE')) {
      this.client.config('SET', 'save', '3600 1');
      this.logger.info('RDB persistence configured.');
    }
  }

  private async resetLastUpdateTimestampOnStart(): Promise<void> {
    if (this.configService.get<string>('RESET_LAST_UPDATE_ON_START') === 'true') {
      await this.clearDataByKey('last_update_timestamp');
      this.logger.info('Last update timestamp reset upon initialization.');
    }
  }

  // Initialize module: connect to Redis and configure RDB if necessary
  async onModuleInit(): Promise<void> {
    try {
      this.client = this.redisService.getClient();
      this.logger.info('Redis client connected.');
      this.configureRdbPersistence();
      this.resetLastUpdateTimestampOnStart();
    } catch (e) {
      this.logger.error('Error initializing RedisConnectionService:', e);
    }
  }

  private ensureClientInitialized(): void {
    if (!this.client) {
      const error = new Error('Redis client not initialized.');
      this.logger.error(error.message);
      throw error;
    }
  }

  // Get value from Redis with retries
  async get(key: string): Promise<string | null> {
    return await retryOperation({ fn: () => this.client.get(key), logger: this.logger });
  }

  // Set key-value pair in Redis with retries
  async set(key: string, value: string): Promise<string> {
    return await retryOperation({
      fn: async () => {
        const result = await this.client.set(key, value);
        if (result !== 'OK') {
          this.logger.error('Error setting key:', key);
          throw new Error('Redis set operation failed');
        }
        return result;
      },
      logger: this.logger,
    });
  }

  async clearDataByKey(key: string): Promise<void> {
    this.ensureClientInitialized();
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      this.client.del(key, (error, _) => {
        if (error) {
          this.logger.error(`Error clearing data by key: ${key}`, error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
