import winston from 'winston';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { retryOperation } from '@utils/retry-operation';
import { LoggerService } from '@libs/logger/logger.service';

import { RedisConnectionService } from '../redis-connection/redis-connection.service';

enum InterfaceType {
  METHOD = 'method',
  ERC = 'erc',
  CONTRACT = 'contract',
}

const DEFAULT_DATE = new Date(0);
const LAST_UPDATE_TIMESTAMP_KEY = 'last_update_timestamp';

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 500,
  // Add more retry-operation configs here if needed
};

const cronString = ['production', 'staging', 'prod'].includes(process.env.NODE_ENV as string)
  ? '0 */12 * * *'
  : '*/1 * * * *';

@Injectable()
export class UpdateService {
  private readonly logger: winston.Logger;

  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly luksoDataDB: LuksoDataDbService,
    private readonly redisConnectionService: RedisConnectionService,
    protected readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getChildLogger('UpdateService');
  }

  private async handleNewInterfaces(newInterfaces: any[], interfaceType: InterfaceType) {
    try {
      if (newInterfaces.length === 0) {
        this.logger.info('No new interfaces found of type ' + interfaceType);
        return;
      }

      this.logger.info(
        `Found ${newInterfaces.length} new ${interfaceType} ${
          interfaceType === InterfaceType.ERC ? 'schemas' : 'interfaces'
        }`,
      );

      const interfaceHandlers = {
        [InterfaceType.METHOD]: async (interfaceItem: any) => {
          await this.structureDB.insertMethodInterface(interfaceItem);
        },
        [InterfaceType.ERC]: async (interfaceItem: any) => {
          await this.structureDB.insertErc725ySchema(interfaceItem);
        },
        [InterfaceType.CONTRACT]: async (interfaceItem: any) => {
          await this.structureDB.insertContractInterface(interfaceItem);
        },
      };

      for (const interfaceItem of newInterfaces) {
        try {
          await interfaceHandlers[interfaceType](interfaceItem);
        } catch (e) {
          this.logger.error(`Error inserting ${interfaceType} interface: ${e.message}`);
        }
      }
    } catch (e) {
      this.logger.error('Error handling new interfaces: ', e);
    }
  }

  private async processInterfaceType(interfaceType: InterfaceType, last_update_timestamp: Date) {
    try {
      const newInterfaces = await retryOperation({
        ...RETRY_CONFIG,
        fn: () => this.structureDB.fetchNewInterfaces(last_update_timestamp, interfaceType),
      });
      this.handleNewInterfaces(newInterfaces, interfaceType);
    } catch (e) {
      this.logger.error(`Error fetching new interfaces for type ${interfaceType}: `, e);
    }
  }

  private async fetchLastUpdateTimestamp(): Promise<Date> {
    try {
      const reply = await retryOperation({
        fn: () => this.redisConnectionService.get(LAST_UPDATE_TIMESTAMP_KEY),
      });
      this.logger.info('Last update timestamp: ' + reply);
      if (reply) {
        const potentialDate = new Date(reply);
        return !isNaN(potentialDate.getTime()) ? potentialDate : DEFAULT_DATE;
      }
    } catch (e) {
      this.logger.error(`Error fetching ${LAST_UPDATE_TIMESTAMP_KEY} from redis: `, e);
    }
    return DEFAULT_DATE;
  }

  private async setLastUpdateTimestamp(timestamp: Date): Promise<void> {
    const formattedTimestamp = timestamp.toISOString();
    try {
      await retryOperation({
        fn: () => this.redisConnectionService.set(LAST_UPDATE_TIMESTAMP_KEY, formattedTimestamp),
      });
      this.logger.info(`Updated ${LAST_UPDATE_TIMESTAMP_KEY} in Redis: ` + formattedTimestamp);
    } catch (e) {
      this.logger.error(`Error setting ${LAST_UPDATE_TIMESTAMP_KEY} in redis: `, e);
    }
  }

  @Cron(cronString)
  async runUpdate() {
    const last_update_timestamp = await this.fetchLastUpdateTimestamp();

    await Promise.all(
      Object.values(InterfaceType).map(async (interfaceType) => {
        await this.processInterfaceType(interfaceType, last_update_timestamp);
      }),
    )
      .then(async () => {
        await this.setLastUpdateTimestamp(new Date());
        this.logger.info('Finished update');
      })
      .catch((e) => {
        this.logger.error('Error running update: ', e);
      });
  }
}
