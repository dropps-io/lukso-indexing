import { Injectable, OnModuleInit } from '@nestjs/common';

import { RedisService } from '@shared/redis/redis.service';
import { DROP_DB_ON_START } from './globals';

/**
 * IndexerService class that is responsible for indexing transactions from the blockchain and persisting them to the database.
 */
@Injectable()
export class IndexerService implements OnModuleInit {
  constructor(protected readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    if (DROP_DB_ON_START) await this.redisService.reset();
  }
}
