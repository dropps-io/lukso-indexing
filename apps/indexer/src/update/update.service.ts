import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { MethodInterfaceTable } from '@db/lukso-structure/entities/methodInterface.table';
import { MethodParameterTable } from '@db/lukso-structure/entities/methodParameter.table';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { TransactionTable } from '@db/lukso-data/entities/tx.table';
import { TxInputTable } from '@db/lukso-data/entities/tx-input.table';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { RedisService } from '@shared/redis/redis.service';
import { REDIS_KEY } from '@shared/redis/redis-keys';

import { DecodingService } from '../decoding/decoding.service';
import { ContractsService } from '../contracts/contracts.service';
import { promiseAllSettledPLimit } from '../utils/promise-p-limit';
import { P_LIMIT } from '../globals';

/**
 * @class UpdateService
 * @description Service for updating contract, transaction, and event data.
 */
@Injectable()
export class UpdateService {
  protected readonly logger: winston.Logger;

  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly redisService: RedisService,
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly decodingService: DecodingService,
    protected readonly contractsService: ContractsService,
  ) {
    this.logger = this.loggerService.getChildLogger('UpdateService');
  }

  /**
   * Try to identify contracts from our database that were not identified, and to update them.
   */
  public async updateContracts(): Promise<void> {
    this.logger.info('Updating contracts...');
    const contracts = await this.dataDB.getUnidentifiedContracts();
    await promiseAllSettledPLimit(
      contracts.map((c) => this.contractsService.indexContract(c)),
      P_LIMIT,
      { logger: this.logger },
    );
  }

  /**
   * Based on the latest interfaces added to the structure database,
   * try to decode & update past transactions and events that match the new interfaces.
   */
  @DebugLogger()
  public async updateTransactionsAndEvents(): Promise<void> {
    this.logger.info('Updating transactions and events...');
    const latestUpdate = await this.getLatestUpdateDate();
    const now = new Date();
    const newMethodInterfaces = await this.structureDB.getMethodInterfaceCreatedAfter(latestUpdate);
    await promiseAllSettledPLimit(
      newMethodInterfaces.map((i) => this.updateWithNewMethodInterface(i)),
      P_LIMIT,
      { logger: this.logger },
    );
    await this.redisService.setDate(REDIS_KEY.LATEST_UPDATE_DATE, now);
  }

  /**
   * Update transactions & events that match a new interface.
   *
   * @param methodInterface The new method interface.
   */
  @DebugLogger()
  protected async updateWithNewMethodInterface(
    methodInterface: MethodInterfaceTable,
  ): Promise<void> {
    const methodParameters = await this.structureDB.getMethodParametersByMethodId(
      methodInterface.id,
    );
    await Promise.allSettled([
      this.updateEventsWithNewMethodInterface(
        methodInterface,
        methodParameters.filter((p) => p.type === 'event'),
      ),
      this.updateTxWithNewMethodInterface(
        methodInterface,
        methodParameters.filter((p) => p.type === 'function'),
      ),
    ]);
  }

  /**
   * Update events based on a new method interface.
   *
   * @param methodInterface - The new method interface.
   * @param methodParameters - Parameters associated to the method interface.
   */
  @DebugLogger()
  protected async updateEventsWithNewMethodInterface(
    methodInterface: MethodInterfaceTable,
    methodParameters: MethodParameterTable[],
  ): Promise<void> {
    const events = await this.dataDB.getEventByMethodId(methodInterface.id);

    await promiseAllSettledPLimit(
      events.map((e) => this.decodeAndUpdateEvent(e, methodInterface, methodParameters)),
      P_LIMIT,
      { logger: this.logger },
    );
  }

  /**
   * Decode and update a single event.
   *
   * @param event - The event to decode and update.
   * @param methodInterface - The associated method interface.
   * @param methodParameters - The method parameters.
   */
  @DebugLogger()
  protected async decodeAndUpdateEvent(
    event: EventTable,
    methodInterface: MethodInterfaceTable,
    methodParameters: MethodParameterTable[],
  ): Promise<void> {
    const decodedParams = await this.decodingService.decodeLogParameters(
      event.data || '',
      [event.topic0, event.topic1 || '', event.topic2 || '', event.topic3 || ''],
      methodParameters,
    );
    await this.dataDB.updateEventName(event.id, methodInterface.name);
    if (decodedParams && decodedParams.length > 0)
      await this.dataDB.insertEventParameters(event.id, decodedParams, 'do nothing');
  }

  /**
   * Update transactions based on a new method interface.
   *
   * @param methodInterface - The new method interface.
   * @param methodParameters - Parameters associated with the method interface.
   */
  @DebugLogger()
  protected async updateTxWithNewMethodInterface(
    methodInterface: MethodInterfaceTable,
    methodParameters: MethodParameterTable[],
  ): Promise<void> {
    const transactions = await this.dataDB.getTransactionsWithInputByMethodId(methodInterface.id);

    await promiseAllSettledPLimit(
      transactions.map((tx) => this.decodeAndUpdateTx(tx, methodInterface, methodParameters)),
      P_LIMIT,
      { logger: this.logger },
    );
  }

  /**
   * Decode and update a single transaction.
   *
   * @param tx - The transaction to decode and update.
   * @param methodInterface - The associated method interface.
   * @param methodParameters - The method parameters.
   */
  @DebugLogger()
  protected async decodeAndUpdateTx(
    tx: TxInputTable & TransactionTable,
    methodInterface: MethodInterfaceTable,
    methodParameters: MethodParameterTable[],
  ): Promise<void> {
    const decodedTx = await this.decodingService.decodeTransactionInput(
      tx.input,
      methodInterface,
      methodParameters,
    );

    if (decodedTx?.methodName)
      await this.dataDB.updateTransactionMethodName(tx.hash, decodedTx.methodName);
    if (decodedTx?.parameters && decodedTx.parameters.length > 0)
      await this.dataDB.insertTransactionParameters(tx.hash, decodedTx.parameters, 'do nothing');
  }

  /**
   * Get the latest update date from Redis.
   *
   * @returns Date for latest update.
   * @throws error if the Redis key for latest update date is missing.
   */
  @DebugLogger()
  protected async getLatestUpdateDate(): Promise<Date> {
    const latestUpdateDate = await this.redisService.getDate(REDIS_KEY.LATEST_UPDATE_DATE);
    if (!latestUpdateDate) throw new Error(`Missing ${REDIS_KEY.LATEST_UPDATE_DATE} REDIS config`);
    return latestUpdateDate;
  }
}
