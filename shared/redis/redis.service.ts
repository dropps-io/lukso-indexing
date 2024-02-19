import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import Redis from 'ioredis';

import { REDIS_KEY } from './redis-keys';
import { REDIS_URI } from '../../apps/indexer/src/globals';

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

  async getDate(key: REDIS_KEY): Promise<Date | null> {
    const value = await this.client.get(key);
    if (value) return new Date(value);
    else return null;
  }

  async set(key: REDIS_KEY, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  async setNumber(key: REDIS_KEY, value: number): Promise<void> {
    await this.client.set(key, value.toString());
  }

  async incrementNumber(key: REDIS_KEY): Promise<void> {
    try {
      await this.client.incr(key);
    } catch (e: any) {
      this.logger.error(`Error incrementing ${key}: ${e.message}`, { stack: e.stack });
    }
  }

  async setDate(key: REDIS_KEY, value: Date): Promise<void> {
    await this.client.set(key, value.toISOString());
  }

  async addAssetToRefreshDataStream(
    address: string,
    tokenId?: string,
    interfaceCode?: string,
  ): Promise<void> {
    try {
      if (interfaceCode && ['EOA', 'LSP6'].includes(interfaceCode)) return; // Skip adding EOA to the stream

      // Generate a unique key for each asset
      const uniqueKey = `unique:${address}:${tokenId || ''}:${interfaceCode || ''}`;

      // Start a transaction
      const transaction = this.client.multi();
      transaction.setnx(uniqueKey, 'true'); // Set the key if it does not exist
      transaction.expire(uniqueKey, 60 * 60 * 24); // 24 hours of uniqueness max

      // Execute the transaction
      const result = await transaction.exec();

      // Check if the transaction was successful and the setnx operation was successful
      if (result && result[0] && typeof result[0][1] === 'number' && result[0][1] === 1) {
        // Proceed with adding to the stream only if setnx was successful
        const args = ['address', address];
        if (tokenId) args.push('tokenId', tokenId);
        if (interfaceCode) args.push('interfaceCode', interfaceCode);

        await this.client.xadd('refresh-data', '*', ...args);

        this.logger.info(
          `Asset added to stream with address: ${address}, tokenId: ${tokenId}, interfaceCode: ${interfaceCode}`,
        );
      } else {
        this.logger.info(`Skipping duplicate asset with key: ${uniqueKey}`);
      }
    } catch (error) {
      this.logger.error('Error adding asset to stream:', error);
      throw error;
    }
  }

  async getRefreshMetadataAssets(
    n: number,
  ): Promise<{ messageId: string; address: string; tokenId?: string; interfaceCode?: string }[]> {
    try {
      const stream = await this.client.xread('COUNT', n, 'STREAMS', 'refresh-data', '0');
      this.logger.info(
        `Retrieved ${stream ? stream[0][1].length : 0} oldest non-processed messages from the stream.`,
      );

      if (!stream) return [];

      // Transforming the data structure to correctly parse messageData
      return stream[0][1].map(([messageId, messageData]) => {
        // Convert messageData from an array of [key, value] pairs to an object
        const dataObj = messageData.reduce(
          (acc, currentValue, index, array) => {
            if (index % 2 === 0) {
              // keys are in even indices
              acc[currentValue] = array[index + 1];
            }
            return acc;
          },
          {} as { address: string; tokenId?: string; interfaceCode?: string },
        );

        return {
          messageId,
          address: dataObj.address,
          tokenId: dataObj.tokenId, // tokenId will be undefined if not provided in the stream
          interfaceCode: dataObj.interfaceCode, // interfaceCode will be undefined if not provided in the stream
        };
      });
    } catch (error) {
      this.logger.error('Error retrieving oldest non-processed messages from stream:', error);
      throw error;
    }
  }

  async markMessagesAsProcessed(messageIds: string[]): Promise<void> {
    try {
      const messages = await this.getRefreshMetadataAssets(messageIds.length); // Assume this method is adapted to retrieve specific messages by ID
      const promises = messageIds.map((id) => this.client.xdel('refresh-data', id));

      // Remove uniqueness constraint for each processed message
      messages.forEach(({ address, tokenId, interfaceCode }) => {
        const uniqueKey = `unique:${address}:${tokenId || ''}:${interfaceCode || ''}`;
        promises.push(this.client.del(uniqueKey));
      });

      await Promise.all(promises);
      this.logger.info(`Marked ${messageIds.length} messages as processed.`);
    } catch (error) {
      this.logger.error('Error marking messages as processed:', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    await this.client.flushall();
    await this.setDate(REDIS_KEY.LATEST_UPDATE_DATE, new Date(Date.now()));
  }
}
