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

enum InterfaceType {
  METHOD = 'method',
  ERC = 'erc',
  CONTRACT = 'contract',
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
  : '*/1 * * * *';

@Injectable()
export class UpdateService {
  private readonly logger: winston.Logger;

  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly luksoDataDB: LuksoDataDbService,
    private readonly redisConnectionService: RedisConnectionService,
    protected readonly loggerService: LoggerService,
    private readonly decodingService: DecodingService,
  ) {
    this.logger = this.loggerService.getChildLogger('UpdateService');
  }

  // private async decodeMethodId(methodId: string): Promise<string | null> {
  //   try {
  //     const method = await
  //     if (method) {
  //       return method.name;
  //     }
  //   } catch (e) {
  //     this.logger.error(`Error decoding methodId ${methodId}: `, e);
  //   }
  //   return null;
  // }
  private async handleNewInterfaces(
    newInterfaces: (ContractInterfaceTable | MethodInterfaceTable | ERC725YSchemaTable)[],
    interfaceType: InterfaceType,
  ) {
    if (newInterfaces.length === 0) {
      this.logger.info(`No new interfaces found of type ${interfaceType}`);
      return;
    }

    this.logger.info(
      `Found ${newInterfaces.length} new ${interfaceType} ${
        interfaceType === InterfaceType.ERC ? 'schemas' : 'interfaces'
      }`,
    );

    try {
      const nonDecodedTransactions = await this.luksoDataDB.fetchNonDecodedTransactionsWithInput();
      //Todo: fetch the other two types of non decoded transactions

      for (const interfaceItem of newInterfaces) {
        switch (interfaceType) {
          case InterfaceType.METHOD:
            if (isMethodInterfaceTable(interfaceItem)) {
              await this.handleMethodInterface(interfaceItem, nonDecodedTransactions);
            }
            break;
          case InterfaceType.ERC:
            if (isErc725YSchemaTable(interfaceItem)) {
              await this.handleErcInterface(interfaceItem);
            }
            break;
          case InterfaceType.CONTRACT:
            if (isContractInterfaceTable(interfaceItem)) {
              await this.handleContractInterface(interfaceItem);
            }
            break;
        }
      }
    } catch (e) {
      this.logger.error('Error handling new interfaces: ', e);
    }
  }

  private async handleMethodInterface(
    interfaceItem: MethodInterfaceTable,
    nonDecodedTransactions: any[], // TODO: transaction with input type, move out of lukso-data-db and then import
  ) {
    this.logger.info(`Decoding all transaction data for methodId ${interfaceItem.id}`);

    for (const tx of nonDecodedTransactions) {
      const decodedData = await this.decodingService.decodeTransactionInput(tx.input);

      if (decodedData && decodedData.methodName) {
        this.logger.info(
          `Transaction ${tx.methodId} decoded: methodId ${
            interfaceItem.id
          } corresponds to methodName ${decodedData.methodName}. 
          Decoded data: ${JSON.stringify(decodedData, null, 2)}`,
        );

        // Update the database with the decoded methodName for this transaction
        await this.luksoDataDB.updateTransactionWithDecodedMethod(tx.methodId, decodedData);
      } else {
        if (VERBOSE) {
          this.logger.debug(
            `Unable to decode transaction ${tx.methodId} using methodId ${interfaceItem.id}`,
          );
        }
      }
    }
  }

  private async handleErcInterface(interfaceItem: ERC725YSchemaTable) {
    // Insert the ERC schema into the database, or handle however you need
    // await this.structureDB.insertErc725ySchema(interfaceItem);
  }

  private async handleContractInterface(interfaceItem: ContractInterfaceTable) {
    // Handle the contract interface as required
    // await this.structureDB.insertContractInterface(interfaceItem);
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

// Type guards
function isMethodInterfaceTable(interfaceItem: any): interfaceItem is MethodInterfaceTable {
  return 'id' in interfaceItem && typeof interfaceItem.id === 'string'; // Adjusted based on your new snippet
}

function isErc725YSchemaTable(interfaceItem: any): interfaceItem is ERC725YSchemaTable {
  return 'someUniqueProperty' in interfaceItem; // Replace with a unique property from ERC725YSchemaTable
}

function isContractInterfaceTable(interfaceItem: any): interfaceItem is ContractInterfaceTable {
  return 'someUniqueProperty' in interfaceItem; // Replace with a unique property from ContractInterfaceTable
}
