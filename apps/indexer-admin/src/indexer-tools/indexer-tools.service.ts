import { Injectable } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { REDIS_KEY } from '@shared/redis/redis-keys';

@Injectable()
export class IndexerToolsService {
  constructor(protected readonly redisService: RedisService) {}
  async getLastIndexedBlocks(): Promise<number | null> {
    return await this.redisService.getNumber(REDIS_KEY.LATEST_TX_INDEXED_BLOCK);
  }
  async getStatus(): Promise<number | null> {
    return await this.redisService.getNumber(REDIS_KEY.INDEXER_STATUS);
  }
  async getChunksSizes(): Promise<number | null> {
    return await this.redisService.getNumber(REDIS_KEY.BLOCK_CHUNK_SIZE);
  }
  async getPLimit(): Promise<number | null> {
    return await this.redisService.getNumber(REDIS_KEY.P_LIMIT);
  }
  async setLastIndexedBlocks(num: number): Promise<void> {
    await this.redisService.setNumber(REDIS_KEY.LATEST_TX_INDEXED_BLOCK, num);
  }
  async setStatus(num: number): Promise<void> {
    await this.redisService.setNumber(REDIS_KEY.INDEXER_STATUS, num);
  }
  async setChunkSizes(num: number): Promise<void> {
    await this.redisService.setNumber(REDIS_KEY.BLOCK_CHUNK_SIZE, num);
  }
  async setPLimit(num: number): Promise<void> {
    await this.redisService.setNumber(REDIS_KEY.P_LIMIT, num);
  }
}
