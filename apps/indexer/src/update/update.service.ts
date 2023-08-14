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
const VERBOSE = false;

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
  private isUpdateRunning = false;

  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly luksoDataDB: LuksoDataDbService,
    private readonly redisConnectionService: RedisConnectionService,
    protected readonly loggerService: LoggerService,
    private readonly decodingService: DecodingService,
  ) {
    this.logger = this.loggerService.getChildLogger('UpdateService');
  }

  private async fetchUndecodedItems(): Promise<DecodingQueue> {
    const [nonDecodedTransactions, nonDecodedWrappedTransaction, nonDecodedEvents] =
      await Promise.all([
        retryOperation({ fn: () => this.luksoDataDB.fetchNonDecodedTransactionsWithInput() }),
        retryOperation({ fn: () => this.luksoDataDB.fetchNonDecodedWrapped() }),
        retryOperation({ fn: () => this.luksoDataDB.fetchNonDecodedEvents() }),
      ]);

    return { nonDecodedTransactions, nonDecodedWrappedTransaction, nonDecodedEvents };
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
          return isMethodInterfaceTable(interfaceItem)
            ? this.handleMethodInterface(interfaceItem, allNonDecoded)
            : false;
        case InterfaceType.ERC:
          return isErc725YSchemaTable(interfaceItem)
            ? this.handleErcInterface(interfaceItem)
            : false;
        case InterfaceType.CONTRACT:
          return isContractInterfaceTable(interfaceItem)
            ? this.handleContractInterface(interfaceItem)
            : false;
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
    if (!result) return null; // No interfaces in the db were matched

    this.logger.info(
      `Decoded transaction with hash ${tx?.hash} using methodId ${result?.methodName}`,
    );
    return result;
  }

  private async decodeEvent(tx: any): Promise<any> {
    const { data, address, methodId, id } = tx;
    const topics: string[] = [];

    if (tx?.topic0) topics.push(tx.topic0);
    if (tx?.topic1) topics.push(tx.topic1);
    if (tx?.topic2) topics.push(tx.topic2);
    if (tx?.topic3) topics.push(tx.topic3);

    const eventInterface = await this.structureDB.getMethodInterfaceById(methodId);
    const eventName = eventInterface?.name;

    const decodedParameters = await this.decodingService.decodeLogParameters(data, topics);

    return decodedParameters && eventName ? { eventName, parameters: decodedParameters } : null;
  }

  private async processEvents(items: any[]): Promise<void> {
    const processedHashes = new Set();

    for (const tx of items) {
      try {
        const hash = tx?.transactionHash || tx?.hash;
        if (processedHashes.has(hash)) continue;
        processedHashes.add(hash);

        const decodedData = await this.decodeEvent(tx);
        if (!decodedData) continue;

        this.logger.info(
          `Event with hash ${hash} has been decoded. Matched interface/schema ${
            tx.id
          } is associated with the event '${
            decodedData.eventName
          }', with parameters ${decodedData.parameters.map((param) => `${param.name} `)}.`,
        );
        this.luksoDataDB.updateEventWithDecodedData(hash, decodedData);
      } catch (error) {
        this.logger.error(`Error processing Event ${tx?.hash}:`, error);
      }
    }
  }

  private async processTransactions(items: any[], type: string): Promise<void> {
    const processedHashes = new Set();

    for (const tx of items) {
      try {
        const hash = tx?.transactionHash || tx?.hash;
        if (processedHashes.has(hash)) continue;
        processedHashes.add(hash);

        const decodedData = await this.decodeTransaction(tx);
        if (!decodedData?.methodName) continue;

        this.logger.info(
          `${type} with hash ${hash} has been decoded. Matched interface/schema ${
            tx.id
          } is associated with the method '${
            decodedData.methodName
          }', with parameters ${decodedData.parameters.map(
            (param: DecodedParameter) => `${param.name} `,
          )}.`,
        );

        this.luksoDataDB.updateTransactionWithDecodedMethod(hash, {
          parameters: [],
          methodName: decodedData.methodName,
        });
      } catch (error) {
        this.logger.error(`Error processing ${type} ${tx?.hash}:`, error);
      }
    }
  }

  private async handleMethodInterface(
    interfaceItem: MethodInterfaceTable,
    queue: DecodingQueue,
  ): Promise<boolean> {
    try {
      const { nonDecodedWrappedTransaction, nonDecodedTransactions, nonDecodedEvents } = queue;

      await Promise.all([
        this.processTransactions(nonDecodedTransactions, 'Transaction'),
        this.processTransactions(nonDecodedWrappedTransaction, 'Wrapped transaction'),
        this.processEvents(nonDecodedEvents),
      ]);

      return true;
    } catch (error) {
      this.logger.error('Error in handleMethodInterface:', error);
      return false;
    }
  }

  private async handleErcInterface(interfaceItem: ERC725YSchemaTable) {
    // Insert the ERC schema into the database
    return true;
  }

  private async handleContractInterface(interfaceItem: ContractInterfaceTable) {
    // Handle the contract interface as required
    return true;
  }

  // This function is called for each interface type (method, erc, contract) in the cron job below (runUpdate)
  private async processInterfaceType(
    interfaceType: InterfaceType,
    last_update_timestamp: Date,
  ): Promise<boolean> {
    try {
      //Get all the new interfaces from the database
      const newInterfaces = await retryOperation({
        ...RETRY_CONFIG,
        fn: () => this.structureDB.fetchNewInterfaces(last_update_timestamp, interfaceType),
      });
      return await this.processAndDecodeNewInterfaces(newInterfaces, interfaceType);
    } catch (error) {
      this.logger.error(`Error fetching new interfaces for type ${interfaceType}: `, error);
      return false;
    }
  }

  private async fetchLastUpdateTimestamp(): Promise<Date> {
    try {
      const reply = await retryOperation({
        fn: () => this.redisConnectionService.get(LAST_UPDATE_TIMESTAMP_KEY),
      });
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
      await retryOperation({
        fn: () => this.redisConnectionService.set(LAST_UPDATE_TIMESTAMP_KEY, formattedTimestamp),
      });
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
