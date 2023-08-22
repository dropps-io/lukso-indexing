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
import { WrappedTxTable } from '@db/lukso-data/entities/wrapped-tx.table';

import { RedisService } from '../redis/redis.service';
import { DecodingService } from '../decoding/decoding.service';

enum InterfaceType {
  METHOD = 'method',
  ERC = 'erc',
  CONTRACT = 'contract',
}

interface DecodingQueue {
  nonDecodedTransactions: any[];
  nonDecodedWrappedTransactions: any[];
  nonDecodedEvents: any[];
}

interface Cache<T> {
  timestamp: number;
  data: T;
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
  : '*/10 * * * * *';

const cacheIntervalFromEnv = Number(process.env.CACHE_REFRESH_INTERVAL_IN_MS);

@Injectable()
export class UpdateService {
  private readonly logger: winston.Logger;
  private isUpdateRunning = false;

  private cacheDuration: number = !isNaN(cacheIntervalFromEnv) ? cacheIntervalFromEnv : 60 * 1000; // Default to 60 seconds if env variable isn't a valid number
  private decodedItemsCache?: Cache<DecodingQueue>;

  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly luksoDataDB: LuksoDataDbService,
    private readonly redisService: RedisService,
    protected readonly loggerService: LoggerService,
    private readonly decodingService: DecodingService,
  ) {
    this.logger = this.loggerService.getChildLogger('UpdateService');
  }

  private async fetchUndecodedItems(): Promise<DecodingQueue> {
    const currentTime = Date.now();

    // Check if cache exists and is valid
    if (
      this.decodedItemsCache &&
      currentTime - this.decodedItemsCache.timestamp < this.cacheDuration
    ) {
      return this.decodedItemsCache.data;
    }

    const [nonDecodedTransactions, nonDecodedWrappedTransactions, nonDecodedEvents] =
      await Promise.all([
        retryOperation(async () => await this.luksoDataDB.fetchNonDecodedWrapped()),
        retryOperation(async () => await this.luksoDataDB.fetchNonDecodedEvents()),
        retryOperation(async () => await this.luksoDataDB.fetchNonDecodedTransactionsWithInput()),
      ]);

    const result = { nonDecodedTransactions, nonDecodedWrappedTransactions, nonDecodedEvents };

    // Update cache
    this.decodedItemsCache = {
      timestamp: currentTime,
      data: result,
    };

    return result;
  }

  private async processAndDecodeNewInterfaces(
    newInterfaces: any[],
    interfaceType: InterfaceType,
  ): Promise<boolean> {
    let result: boolean[] = [];
    if (!newInterfaces.length) {
      this.logger.info(`No new interfaces of type ${interfaceType} found.`);
      return true;
    }

    const label = interfaceType === InterfaceType.ERC ? 'schemas' : 'interfaces';
    this.logger.info(`Found ${newInterfaces.length} new ${interfaceType} ${label}`);

    try {
      //get all the non decoded transactions, wrapped transactions and events
      const allNonDecoded = await this.fetchUndecodedItems();

      //iterate over all the items and attempt to decode them with the new interfaces
      result = await Promise.all(
        newInterfaces.map((interfaceItem) =>
          this.handleInterfaceByType(interfaceItem, interfaceType, allNonDecoded),
        ),
      );

      this.logger.info(
        `Successfully decoded ${result.filter((r) => r).length} of ${
          result.length
        } new ${interfaceType} ${label}`,
      );

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
          return this.handleMethodInterface(allNonDecoded, interfaceType, interfaceItem);
        case InterfaceType.ERC:
          return this.handleErcInterface(allNonDecoded, interfaceType, interfaceItem);
        case InterfaceType.CONTRACT:
          return this.handleContractInterface(allNonDecoded, interfaceType, interfaceItem);

        default:
          this.logger.error(`Unsupported interface type: ${interfaceType}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Error handling interface of type ${interfaceType}:`, error);
      return false;
    }
  }
  private async decodeTransaction(tx: any) {
    if (!tx?.input) {
      this.logger.warn(`Transaction with hash ${tx?.hash} has no input.`);
      return null;
    }
    const result = await this.decodingService.decodeTransactionInput(tx.input);
    if (!result) return null;

    return result;
  }

  private async decodeEvent(tx: any): Promise<any> {
    const { data, methodId } = tx;
    const topics: string[] = [];

    if (tx?.topic0) topics.push(tx.topic0);
    if (tx?.topic1) topics.push(tx.topic1);
    if (tx?.topic2) topics.push(tx.topic2);
    if (tx?.topic3) topics.push(tx.topic3);

    const eventInterface = await this.structureDB.getMethodInterfaceById(methodId);
    const eventName = eventInterface?.name;

    if (!eventName) return null;

    const decodedParameters = await this.decodingService.decodeLogParameters(data, topics);

    return decodedParameters && eventName ? { eventName, parameters: decodedParameters } : null;
  }

  private async processEvents(
    items: any[],
    interfaceType: string,
    interfaceItem: MethodInterfaceTable | ERC725YSchemaTable | ContractInterfaceTable,
  ): Promise<void> {
    const processedHashes = new Set();

    for (const tx of items) {
      try {
        const hash = tx?.transactionHash || tx?.hash;
        if (processedHashes.has(hash)) continue;
        processedHashes.add(hash);

        const decodedData = await this.decodeEvent(tx);
        if (!decodedData?.eventName) continue;

        const matchedInterface = this.getMatchedInterface(
          tx,
          { methodName: decodedData.eventName, ...decodedData },
          interfaceItem,
          interfaceType,
        );

        if (!matchedInterface) continue;

        const id = await this.luksoDataDB.updateEventName(hash, decodedData.eventName);
        if (id && decodedData.parameters) {
          this.luksoDataDB.insertEventParameters(hash, decodedData.parameters, 'do nothing');
        } else {
          this.logger.warn(`Event with hash ${hash} has no parameters.`);
        }

        this.logger.info(
          `Event with hash ${hash} has been decoded. Matched interface/schema ${
            matchedInterface.id
          } is associated with the event '${
            decodedData.eventName
          }', with parameters ${decodedData.parameters.map((param) => `${param.name} `)}.`,
        );
      } catch (error) {
        this.logger.error(`Error processing Event ${tx?.hash}:`, error);
      }
    }
  }

  private async processTransactions(
    items: any[],
    type: string,
    interfaceType: string,
    interfaceItem: MethodInterfaceTable | ERC725YSchemaTable | ContractInterfaceTable,
  ): Promise<void> {
    const processedHashes = new Set();

    for (const tx of items) {
      const hash = tx?.transactionHash || tx?.hash;

      if (processedHashes.has(hash)) continue;
      processedHashes.add(hash);

      try {
        const decodedData = await this.decodeTransaction(tx);
        if (!decodedData?.methodName) continue;

        const matchedInterface = this.getMatchedInterface(
          tx,
          decodedData,
          interfaceItem,
          interfaceType,
        );

        if (!matchedInterface) continue;

        const { methodName, parameters } = decodedData;

        if (interfaceType === 'Wrapped transaction') {
          const wrappedTransaction = this.prepareWrappedTransaction(tx, decodedData);
          const { id } = await this.luksoDataDB.insertWrappedTx(wrappedTransaction);
          if (id) this.luksoDataDB.insertWrappedTxParameters(id, parameters, 'do nothing');
        } else if (interfaceType === 'Transaction') {
          this.luksoDataDB.insertTransactionName(hash, methodName);
          this.luksoDataDB.insertTransactionParameters(hash, parameters, 'do nothing');
        }

        this.logger.debug(
          `${type} with hash ${hash} decoded. Interface/schema ${
            matchedInterface.id
          } is associated with the method '${methodName}' with parameters ${parameters.map(
            (param) => `${param.name} `,
          )}.`,
        );
      } catch (error) {
        this.logger.error(`Error processing ${type} ${tx?.hash}:`, error);
      }
    }
  }

  private getMatchedInterface(
    tx: any,
    decodedData: any,
    interfaceItem: MethodInterfaceTable | ERC725YSchemaTable | ContractInterfaceTable,
    interfaceType: string,
  ): any | undefined {
    if (interfaceType === InterfaceType.ERC) {
      const ercItem = interfaceItem as ERC725YSchemaTable;
      return tx?.key === ercItem.key && ercItem.name === decodedData.methodName
        ? ercItem
        : undefined;
    }
    // if it has a version, it's a contract interface, otherwise it's a method interface (type of event or function)
    if (Object.prototype.hasOwnProperty.call(interfaceItem, 'type')) {
      const methodInterface = interfaceItem as MethodInterfaceTable;
      return methodInterface.name === decodedData.methodName ? methodInterface : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(interfaceItem, 'version')) {
      const contractInterface = interfaceItem as ContractInterfaceTable;
      return contractInterface.name === decodedData.methodName ? contractInterface : undefined;
    }

    return undefined;
  }

  private prepareWrappedTransaction(tx: any, decodedData: any): Omit<WrappedTxTable, 'id'> {
    const { methodId, methodName } = decodedData;
    return {
      transactionHash: tx?.transactionHash || tx?.hash,
      parentId: tx.parentId || null,
      blockNumber: tx.blockNumber,
      from: tx.from,
      to: tx.to,
      value: tx.value || '0',
      methodId: methodId,
      methodName: methodName,
    };
  }

  private async handleMethodInterface(
    queue: DecodingQueue,
    interfaceType: string,
    interfaceItem: MethodInterfaceTable,
  ): Promise<boolean> {
    try {
      const { nonDecodedWrappedTransactions, nonDecodedTransactions, nonDecodedEvents } = queue;

      await Promise.all([
        this.processTransactions(
          nonDecodedTransactions,
          'Transaction',
          interfaceType,
          interfaceItem,
        ),
        this.processTransactions(
          nonDecodedWrappedTransactions,
          'Wrapped transaction',
          interfaceType,
          interfaceItem,
        ),
        this.processEvents(nonDecodedEvents, interfaceType, interfaceItem),
      ]);

      return true;
    } catch (error) {
      this.logger.error('Error in handleMethodInterface:', error);
      return false;
    }
  }

  private async handleErcInterface(
    queue: DecodingQueue,
    interfaceType: string,
    interfaceItem: ERC725YSchemaTable,
  ): Promise<boolean> {
    try {
      const { nonDecodedWrappedTransactions, nonDecodedTransactions, nonDecodedEvents } = queue;

      await Promise.all([
        this.processTransactions(
          nonDecodedTransactions,
          'Transaction',
          interfaceType,
          interfaceItem,
        ),
        this.processTransactions(
          nonDecodedWrappedTransactions,
          'Wrapped transaction',
          interfaceType,
          interfaceItem,
        ),
        this.processEvents(nonDecodedEvents, interfaceType, interfaceItem),
      ]);

      return true;
    } catch (error) {
      this.logger.error('Error in handleMethodInterface:', error);
      return false;
    }
  }

  private async handleContractInterface(
    queue: DecodingQueue,
    interfaceType: string,
    interfaceItem: ContractInterfaceTable,
  ): Promise<boolean> {
    try {
      const { nonDecodedWrappedTransactions, nonDecodedTransactions, nonDecodedEvents } = queue;

      await Promise.all([
        this.processTransactions(
          nonDecodedTransactions,
          'Transaction',
          interfaceType,
          interfaceItem,
        ),
        this.processTransactions(
          nonDecodedWrappedTransactions,
          'Wrapped transaction',
          interfaceType,
          interfaceItem,
        ),
        this.processEvents(nonDecodedEvents, interfaceType, interfaceItem),
      ]);

      return true;
    } catch (error) {
      this.logger.error('Error in handleMethodInterface:', error);
      return false;
    }
  }

  // This function is called for each interface type (method, erc, contract) in the cron job below (runUpdate)
  private async processInterfaceType(
    interfaceType: InterfaceType,
    last_update_timestamp: Date,
  ): Promise<boolean> {
    try {
      // Define the function to retrieve interfaces based on the type
      let fetchInterfaceFn: () => Promise<any>;

      switch (interfaceType) {
        case InterfaceType.ERC:
          fetchInterfaceFn = () => this.structureDB.getErc725Schemas(last_update_timestamp);
          break;
        case InterfaceType.CONTRACT:
          fetchInterfaceFn = () => this.structureDB.getContractInterfaces(last_update_timestamp);
          break;
        case InterfaceType.METHOD:
          fetchInterfaceFn = () => this.structureDB.getMethodInterfaces(last_update_timestamp);
          break;
        default:
          throw new Error(`Unsupported interface type: ${interfaceType}`);
      }

      // Fetch the new interfaces with the retry operation
      const newInterfaces: any[] = await retryOperation(async () => await fetchInterfaceFn(), {
        ...RETRY_CONFIG,
      });

      if (!newInterfaces.length) {
        this.logger.info(`No new interfaces of type ${interfaceType} found.`);
        return false;
      }

      return await this.processAndDecodeNewInterfaces(newInterfaces, interfaceType);
    } catch (error) {
      this.logger.error(`Error fetching new interfaces for type ${interfaceType}: `, error);
      return false;
    }
  }

  private async fetchLastUpdateTimestamp(): Promise<Date> {
    try {
      const reply = await retryOperation(async () => {
        return await this.redisService.get(LAST_UPDATE_TIMESTAMP_KEY);
      }).then((res) => res?.toString());
      this.logger.info('Last update timestamp: ' + reply);
      return reply ? new Date(reply) : DEFAULT_DATE;
    } catch (error) {
      this.logger.error(`Error fetching ${LAST_UPDATE_TIMESTAMP_KEY} from redis: `, error);
      return DEFAULT_DATE;
    }
  }

  private async setLastUpdateTimestamp(timestamp: Date): Promise<void> {
    const formattedTimestamp = timestamp.toISOString();
    try {
      await retryOperation(
        async () => await this.redisService.set(LAST_UPDATE_TIMESTAMP_KEY, formattedTimestamp),
        { ...RETRY_CONFIG },
      );

      this.logger.info(`Updated ${LAST_UPDATE_TIMESTAMP_KEY} in Redis: ` + formattedTimestamp);
    } catch (error) {
      this.logger.error(`Error setting ${LAST_UPDATE_TIMESTAMP_KEY} in redis: `, error);
    }
  }

  @Cron(cronString)
  async runUpdate() {
    if (this.isUpdateRunning) {
      this.logger.warn('Update is already in progress.');
      return;
    }

    try {
      this.isUpdateRunning = true;
      const lastUpdateTimestamp = await this.fetchLastUpdateTimestamp();
      await Promise.all(
        Object.values(InterfaceType).map((interfaceType) =>
          this.processInterfaceType(interfaceType, lastUpdateTimestamp),
        ),
      );
      await this.setLastUpdateTimestamp(new Date());
      this.logger.info('Update complete');
    } catch (error) {
      this.logger.error('Error running update: ', error);
    } finally {
      this.isUpdateRunning = false;
    }
  }
}
