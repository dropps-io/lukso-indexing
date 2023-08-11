import winston from 'winston';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { retryOperation } from '@utils/retry-operation';
import { LoggerService } from '@libs/logger/logger.service';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';
import { MethodInterfaceTable } from '@db/lukso-structure/entities/methodInterface.table';
import { ERC725YSchemaTable } from '@db/lukso-structure/entities/erc725YSchema.table';

import { RedisConnectionService } from '../redis-connection/redis-connection.service';
import { DecodingService } from '../decoding/decoding.service';
import { DecodedParameter } from '../decoding/types/decoded-parameter';

enum InterfaceType {
  METHOD = 'method',
  ERC = 'erc',
  CONTRACT = 'contract',
}

interface DecodingQueue {
  nonDecodedTransactions: any[];
  nonDecodedWrappedTransaction: any[];
  nonDecodedEvents: any[];
}

// Type guards
function isMethodInterfaceTable(interfaceItem: any): interfaceItem is MethodInterfaceTable {
  return 'id' in interfaceItem && typeof interfaceItem.id === 'string';
}

function isErc725YSchemaTable(interfaceItem: any): interfaceItem is ERC725YSchemaTable {
  return 'someUniqueProperty' in interfaceItem; // Replace with a unique property from ERC725YSchemaTable
}

function isContractInterfaceTable(interfaceItem: any): interfaceItem is ContractInterfaceTable {
  return 'someUniqueProperty' in interfaceItem; // Replace with a unique property from ContractInterfaceTable
}

const DEFAULT_DATE = new Date(0);
const LAST_UPDATE_TIMESTAMP_KEY = 'last_update_timestamp';
const VERBOSE = true;

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 500,
  // Add more retry-operation configs here if needed
};

const cronString = ['production', 'staging', 'prod'].includes(process.env.NODE_ENV as string)
  ? '0 */12 * * *'
  : '*/10 * * * * *';

@Injectable()
export class UpdateService {
  private readonly logger: winston.Logger;

  private isUpdateRunning = false; // New locking mechanism

  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly luksoDataDB: LuksoDataDbService,
    private readonly redisConnectionService: RedisConnectionService,
    protected readonly loggerService: LoggerService,
    private readonly decodingService: DecodingService,
  ) {
    this.logger = this.loggerService.getChildLogger('UpdateService');
  }

  private async fetchAllNonDecoded(): Promise<DecodingQueue> {
    const [nonDecodedTransactions, nonDecodedWrappedTransaction, nonDecodedEvents] =
      await Promise.all([
        retryOperation({ fn: () => this.luksoDataDB.fetchNonDecodedTransactionsWithInput() }),
        retryOperation({ fn: () => this.luksoDataDB.fetchNonDecodedWrapped() }),
        retryOperation({ fn: () => this.luksoDataDB.fetchNonDecodedEvents() }),
      ]);

    return { nonDecodedTransactions, nonDecodedWrappedTransaction, nonDecodedEvents };
  }

  private async handleNewInterfaces(
    newInterfaces: any[],
    interfaceType: InterfaceType,
  ): Promise<boolean> {
    if (!newInterfaces.length) {
      this.logger.info(`No new interfaces of type ${interfaceType} found.`);
      return true;
    }

    const label = interfaceType === InterfaceType.ERC ? 'schemas' : 'interfaces';
    this.logger.info(`Found ${newInterfaces.length} new ${interfaceType} ${label}`);

    try {
      const allNonDecoded = await this.fetchAllNonDecoded();

      for (const interfaceItem of newInterfaces) {
        await this.handleInterfaceByType(interfaceItem, interfaceType, allNonDecoded);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error handling new interfaces of type ${interfaceType}:`, error);
      return false;
    }
  }

  private async handleInterfaceByType(
    interfaceItem: any,
    interfaceType: InterfaceType,
    allNonDecoded: DecodingQueue,
  ): Promise<boolean> {
    try {
      switch (interfaceType) {
        case InterfaceType.METHOD:
          if (isMethodInterfaceTable(interfaceItem)) {
            await this.handleMethodInterface(interfaceItem, allNonDecoded);
            return true;
          }
          return false;

        case InterfaceType.ERC:
          if (isErc725YSchemaTable(interfaceItem)) {
            await this.handleErcInterface(interfaceItem);
            return true;
          }
          return false;

        case InterfaceType.CONTRACT:
          if (isContractInterfaceTable(interfaceItem)) {
            await this.handleContractInterface(interfaceItem);
            return true;
          }
          return false;

        default:
          this.logger.error(`Unsupported interface type: ${interfaceType}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Error handling interface of type ${interfaceType}:`, error);
      return false;
    }
  }

  private async handleMethodInterface(
    interfaceItem: MethodInterfaceTable,
    queue: DecodingQueue,
  ): Promise<boolean> {
    try {
      // Decoding helper functions
      const decodeTransaction = async (tx: any) => {
        return this.decodingService.decodeTransactionInput(tx?.input);
      };

      const decodeEvent = async (tx: any) => {
        const topics = tx?.topics || [];
        const data = tx?.data || '';
        return this.decodingService.decodeLogParameters(topics, data);
      };

      const processItems = async (
        items: any[],
        type: string,
        updateFunction: (
          hash: any,
          data: { parameters: DecodedParameter[]; methodName: string },
        ) => any,
      ): Promise<void> => {
        for (const tx of items) {
          const hash = tx?.transactionHash || tx?.hash;

          let decodedData: any;
          if (type === 'Event') {
            decodedData = await decodeEvent(tx);
            if (decodedData) {
              this.logger.info(
                `${type} with hash ${hash} has been decoded. Matched interface/schema ${interfaceItem.id} is associated with the event ${decodedData}.`,
              );
              await updateFunction(hash, { parameters: decodedData, methodName: '' });
            }
          } else {
            // decodedData = await decodeTransaction(tx);
            // if (decodedData?.methodName) {
            //   this.logger.info(
            //     `${type} with hash ${hash} has been decoded. Matched interface/schema ${interfaceItem.id} is associated with the methodName ${decodedData.methodName}.`,
            //   );
            //   await updateFunction(hash, { parameters: [], methodName: decodedData.methodName });
            // }
          }

          // Log if VERBOSE is enabled and decoding was unsuccessful
          if (!decodedData && VERBOSE) {
            this.logger.debug(
              `Unable to decode ${type} ${tx.methodId} using methodId ${interfaceItem.id}`,
            );
          }
        }
      };

      await Promise.all([
        processItems(
          queue.nonDecodedTransactions,
          'Transaction',
          this.luksoDataDB.updateTransactionWithDecodedMethod.bind(this.luksoDataDB),
        ),
        processItems(
          queue.nonDecodedWrappedTransaction,
          'Wrapped transaction',
          this.luksoDataDB.updateWrappedTransactionWithDecodedMethod.bind(this.luksoDataDB),
        ),
        processItems(
          queue.nonDecodedEvents,
          'Event',
          this.luksoDataDB.updateEventWithDecodedMethod.bind(this.luksoDataDB),
        ),
      ]);

      return true; // Assuming successful execution of handleMethodInterface
    } catch (error) {
      this.logger.error('Error in handleMethodInterface:', error);
      return false;
    }
  }

  private async handleErcInterface(interfaceItem: ERC725YSchemaTable) {
    // Insert the ERC schema into the database
  }

  private async handleContractInterface(interfaceItem: ContractInterfaceTable) {
    // Handle the contract interface as required
  }

  private async processInterfaceType(
    interfaceType: InterfaceType,
    last_update_timestamp: Date,
  ): Promise<boolean> {
    try {
      const newInterfaces = await retryOperation({
        ...RETRY_CONFIG,
        fn: () => this.structureDB.fetchNewInterfaces(last_update_timestamp, interfaceType),
      });
      const result = await this.handleNewInterfaces(newInterfaces, interfaceType);
      return result;
    } catch (e) {
      this.logger.error(`Error fetching new interfaces for type ${interfaceType}: `, e);
      return false;
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
    if (this.isUpdateRunning) {
      this.logger.warn('Update is already in progress.');
      return; // Lock the update to prevent multiple instances running at once
    }

    try {
      this.logger.info('Starting update');
      this.isUpdateRunning = true;
      const last_update_timestamp = await this.fetchLastUpdateTimestamp();

      await Promise.all(
        Object.values(InterfaceType).map(async (interfaceType) => {
          await this.processInterfaceType(interfaceType, last_update_timestamp);
        }),
      );
      await this.setLastUpdateTimestamp(new Date());
      this.logger.info('Update complete');
    } catch (e) {
      this.logger.error('Error running update: ', e);
    }

    this.isUpdateRunning = false;
  }
}
