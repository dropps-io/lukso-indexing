import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LoggerService } from '@libs/logger/logger.service';
import { Cron } from '@nestjs/schedule';
import { PreventOverlap } from '@decorators/prevent-overlap.decorator';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { RedisService } from '@shared/redis/redis.service';
import { REDIS_KEY } from '@shared/redis/redis-keys';

import { EthersService } from '../ethers/ethers.service';
import { TransactionsService } from '../transactions/transactions.service';
import { ContractsService } from '../contracts/contracts.service';
import { EventsService } from '../events/events.service';
import {
  DEFAULT_BLOCKS_CHUNK_SIZE,
  DEFAULT_BLOCKS_P_LIMIT,
  CRON_PROCESS,
  CRON_UPDATE,
  DEFAULT_EVENTS_CHUNK_SIZE,
  DEFAULT_P_LIMIT,
  DEFAULT_INDEXER_STATUS,
} from '../globals';
import { TokensService } from '../tokens/tokens.service';
import { promiseAllPLimit, promiseAllSettledPLimit } from '../utils/promise-p-limit';
import { UpdateService } from '../update/update.service';

@Injectable()
export class SchedulingService {
  private readonly logger: winston.Logger;

  constructor(
    private readonly dataDB: LuksoDataDbService,
    private readonly ethersService: EthersService,
    private readonly loggerService: LoggerService,
    private readonly transactionsService: TransactionsService,
    private readonly contractsService: ContractsService,
    private readonly eventsService: EventsService,
    private readonly tokensService: TokensService,
    protected readonly redisService: RedisService,
    protected readonly updateService: UpdateService,
  ) {
    this.logger = loggerService.getChildLogger('SchedulingService');
    this.logger.info('Indexer starting...');
  }

  /**
   * Indexes data from blocks in a batch-wise manner.
   * This method is designed to handle large numbers of blocks by breaking them into smaller batches.
   * It indexes transactions within blocks and updates the latest indexed block in the database.
   * The method will recursively call itself after a specified timeout.
   */
  @Cron(CRON_PROCESS)
  @PreventOverlap()
  @ExceptionHandler(false)
  protected async indexByBlock() {
    if ((await this.getIndexerStatus()) === 0) return;
    // Retrieve configuration and block data
    const lastBlock = await this.ethersService.getLastBlock();
    const fromBlock = (await this.getLatestTxIndexedBlock()) + 1;

    // Function to index all transactions within a block
    const indexBlock = async (blockNumber: number) => {
      // Get transaction hashes for the block
      const txHashes = await this.ethersService.getBlockTransactions(blockNumber);
      this.logger.debug(`Indexing ${txHashes.length} transactions from block ${blockNumber}`);

      await promiseAllSettledPLimit(
        txHashes.map((txHash) => this.transactionsService.indexTransaction(txHash)),
        await this.getPLimit(),
        { logger: this.logger },
      );
    };

    const toBlock = Math.min(fromBlock + (await this.getBlockChunkSize()) - 1, lastBlock);

    if (fromBlock >= toBlock) return;

    this.logger.info(`Indexing transactions from blocks ${fromBlock} to ${toBlock}`);

    const promises = Array.from({ length: toBlock - fromBlock + 1 }, (_, i) =>
      indexBlock(fromBlock + i),
    );

    // Wait for all promises in the current chunk to resolve
    await promiseAllPLimit(promises, await this.getBlocksPLimit());

    // Update the latest indexed block for the current chunk
    await this.redisService.setNumber(REDIS_KEY.LATEST_TX_INDEXED_BLOCK, toBlock);
  }

  /**
   * Indexes events by retrieving past logs from the latest indexed event block up to a specified block.
   * This method is designed to handle large numbers of events by breaking them into smaller batches.
   * It indexes transactions and events associated with logs and updates the latest indexed event block in the database.
   * The method will recursively call itself after a specified timeout.
   */
  @Cron(CRON_PROCESS)
  @PreventOverlap()
  @ExceptionHandler(false)
  protected async indexByEvents() {
    if ((await this.getIndexerStatus()) === 0) return;
    // Retrieve configuration and block data
    const fromBlock: number = (await this.getLatestEventIndexedBlock()) + 1;

    const lastBlock = await this.ethersService.getLastBlock();
    // Determine the block number until which we should index in this iteration
    const toBlock = Math.min(fromBlock + (await this.getEventChunkSize()) - 1, lastBlock);

    if (fromBlock >= toBlock) return;

    this.logger.info(`Indexing events from block ${fromBlock} to ${toBlock}`);

    // Retrieve logs from the specified block range
    const logs = await this.ethersService.getPastLogs(fromBlock, toBlock);

    // Process transactions and events in batches concurrently
    await promiseAllPLimit(
      logs.map((log) => this.eventsService.indexEvent(log)),
      await this.getPLimit(),
    );

    // Update the latest indexed event block in the database and logger
    await this.redisService.setNumber(REDIS_KEY.LATEST_EVENT_INDEXED_BLOCK, toBlock);
  }

  /**
   * Processes and indexes contracts from the list of contracts to be indexed.
   * This method is designed to handle large numbers of contracts by breaking them into smaller batches.
   * It indexes contracts and their metadata, and updates the database accordingly.
   * The method will recursively call itself after a specified timeout based on the CONTRACTS_PROCESSING_INTERVAL.
   *
   * @throws {Error} If there is an error while processing and indexing contracts.
   */
  @Cron(CRON_PROCESS)
  @PreventOverlap()
  @ExceptionHandler(false)
  protected async processContractsToIndex() {
    if ((await this.getIndexerStatus()) === 0) return;
    // Retrieve the list of contracts to be indexed
    const contractsToIndex = await this.dataDB.getContractsToIndex();

    if (contractsToIndex.length > 0)
      this.logger.info(`Processing ${contractsToIndex.length} contracts to index`);
    else this.logger.debug(`Processing ${contractsToIndex.length} contracts to index`);

    // Process contract chunks concurrently
    await promiseAllSettledPLimit(
      contractsToIndex.map((contract) => this.contractsService.indexContract(contract)),
      await this.getPLimit(),
      { logger: this.logger },
    );
  }

  /**
   * Processes contract tokens to be indexed in batches. The function retrieves the list of contract tokens,
   * splits them into chunks, and indexes each chunk concurrently. After the process is completed, it schedules
   * the next execution of the function based on a calculated timeout.
   */
  @Cron(CRON_PROCESS)
  @PreventOverlap()
  @ExceptionHandler(false)
  protected async processContractTokensToIndex() {
    if ((await this.getIndexerStatus()) === 0) return;
    // Retrieve the list of contract tokens to be indexed
    const tokensToIndex = await this.dataDB.getTokensToIndex();

    if (tokensToIndex.length > 0)
      this.logger.info(`Processing ${tokensToIndex.length} contract tokens to index`);
    else this.logger.debug(`Processing ${tokensToIndex.length} contract tokens to index`);

    await promiseAllSettledPLimit(
      tokensToIndex.map((token) => this.tokensService.indexToken(token)),
      await this.getPLimit(),
      { logger: this.logger },
    );
  }

  @Cron(CRON_UPDATE)
  @PreventOverlap()
  @ExceptionHandler(false)
  protected async updateContracts() {
    await this.updateService.updateContracts();
  }

  @Cron(CRON_UPDATE)
  @PreventOverlap()
  @ExceptionHandler(false)
  protected async updateTxAndEvents() {
    await this.updateService.updateTransactionsAndEvents();
  }

  protected async getLatestTxIndexedBlock(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.LATEST_TX_INDEXED_BLOCK);
    return value || 0;
  }

  protected async getLatestEventIndexedBlock(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.LATEST_EVENT_INDEXED_BLOCK);
    return value || 0;
  }

  protected async getPLimit(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.P_LIMIT);
    if (value == null) {
      await this.redisService.setNumber(REDIS_KEY.P_LIMIT, DEFAULT_P_LIMIT);
    }
    return value || DEFAULT_P_LIMIT;
  }

  protected async getBlocksPLimit(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.BLOCKS_P_LIMIT);
    if (value == null) {
      await this.redisService.setNumber(REDIS_KEY.BLOCKS_P_LIMIT, DEFAULT_BLOCKS_P_LIMIT);
    }
    return value || DEFAULT_BLOCKS_P_LIMIT;
  }

  protected async getEventChunkSize(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.EVENTS_CHUNK_SIZE);
    if (value == null) {
      await this.redisService.setNumber(REDIS_KEY.EVENTS_CHUNK_SIZE, DEFAULT_EVENTS_CHUNK_SIZE);
    }
    return value || DEFAULT_EVENTS_CHUNK_SIZE;
  }

  protected async getBlockChunkSize(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.BLOCK_CHUNK_SIZE);
    if (value == null) {
      await this.redisService.setNumber(REDIS_KEY.BLOCK_CHUNK_SIZE, DEFAULT_BLOCKS_CHUNK_SIZE);
    }
    return value || DEFAULT_BLOCKS_CHUNK_SIZE;
  }

  // The indexer status determines whether the indexer is on or off
  // 0 = OFF / 1 = ON
  protected async getIndexerStatus(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.INDEXER_STATUS);
    if (value == null) {
      await this.redisService.setNumber(REDIS_KEY.INDEXER_STATUS, DEFAULT_INDEXER_STATUS);
    }
    return value || DEFAULT_INDEXER_STATUS;
  }
}
