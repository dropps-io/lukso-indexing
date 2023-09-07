import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LoggerService } from '@libs/logger/logger.service';
import { Cron } from '@nestjs/schedule';
import { PreventOverlap } from '@decorators/prevent-overlap.decorator';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import pLimit from 'p-limit';

import { EthersService } from '../ethers/ethers.service';
import { TransactionsService } from '../transactions/transactions.service';
import { ContractsService } from '../contracts/contracts.service';
import { EventsService } from '../events/events.service';
import {
  BLOCKS_CHUNK_SIZE,
  BLOCKS_P_LIMIT,
  CRON_PROCESS,
  EVENTS_CHUNK_SIZE,
  P_LIMIT,
} from '../globals';
import { TokensService } from '../tokens/tokens.service';

@Injectable()
export class SchedulingService {
  private readonly logger: winston.Logger;

  constructor(
    private readonly structureDB: LuksoStructureDbService,
    private readonly dataDB: LuksoDataDbService,
    private readonly ethersService: EthersService,
    private readonly loggerService: LoggerService,
    private readonly transactionsService: TransactionsService,
    private readonly contractsService: ContractsService,
    private readonly eventsService: EventsService,
    private readonly tokensService: TokensService,
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
    // Retrieve configuration and block data
    const config = await this.structureDB.getConfig();
    const lastBlock = await this.ethersService.getLastBlock();
    const fromBlock = config.latestIndexedBlock + 1;

    // Function to index all transactions within a block
    const indexBlock = async (blockNumber: number) => {
      // Get transaction hashes for the block
      const txHashes = await this.ethersService.getBlockTransactions(blockNumber);
      this.logger.debug(`Indexing ${txHashes.length} transactions from block ${blockNumber}`);

      await this.promiseAllPLimit(
        txHashes.map((txHash) => this.transactionsService.indexTransaction(txHash)),
        P_LIMIT,
      );
    };

    const toBlock = Math.min(fromBlock + BLOCKS_CHUNK_SIZE - 1, lastBlock);

    if (fromBlock >= toBlock) return;

    this.logger.info(`Indexing transactions from blocks ${fromBlock} to ${toBlock}`);

    const promises = Array.from({ length: toBlock - fromBlock + 1 }, (_, i) =>
      indexBlock(fromBlock + i),
    );

    // Wait for all promises in the current chunk to resolve
    await this.promiseAllPLimit(promises, BLOCKS_P_LIMIT);

    // Update the latest indexed block for the current chunk
    await this.structureDB.updateLatestIndexedBlock(toBlock);
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
    // Retrieve configuration and block data
    const config = await this.structureDB.getConfig();
    const fromBlock: number = config.latestIndexedEventBlock + 1;

    const lastBlock = await this.ethersService.getLastBlock();
    // Determine the block number until which we should index in this iteration
    const toBlock = Math.min(fromBlock + EVENTS_CHUNK_SIZE - 1, lastBlock);

    if (fromBlock >= toBlock) return;

    this.logger.info(`Indexing events from block ${fromBlock} to ${toBlock}`);

    // Retrieve logs from the specified block range
    const logs = await this.ethersService.getPastLogs(fromBlock, toBlock);

    // Split transaction hashes and logs into chunks for batch processing
    const txHashes = logs
      .map((log) => log.transactionHash)
      .filter((transactionHash, index, self) => self.indexOf(transactionHash) === index);

    // Process transactions and events in batches concurrently
    await Promise.all([
      this.promiseAllPLimit(
        logs.map((log) => this.eventsService.indexEvent(log)),
        P_LIMIT,
      ),
      this.promiseAllPLimit(
        txHashes.map((txHash) => this.transactionsService.indexTransaction(txHash)),
        P_LIMIT,
      ),
    ]);

    // Update the latest indexed event block in the database and logger
    await this.structureDB.updateLatestIndexedEventBlock(toBlock);
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
    // Retrieve the list of contracts to be indexed
    const contractsToIndex = await this.dataDB.getContractsToIndex();

    if (contractsToIndex.length > 0)
      this.logger.info(`Processing ${contractsToIndex.length} contracts to index`);
    else this.logger.debug(`Processing ${contractsToIndex.length} contracts to index`);

    // Process contract chunks concurrently
    await this.promiseAllPLimit(
      contractsToIndex.map((contract) => this.contractsService.indexContract(contract)),
      P_LIMIT,
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
    // Retrieve the list of contract tokens to be indexed
    const tokensToIndex = await this.dataDB.getTokensToIndex();

    if (tokensToIndex.length > 0)
      this.logger.info(`Processing ${tokensToIndex.length} contract tokens to index`);
    else this.logger.debug(`Processing ${tokensToIndex.length} contract tokens to index`);

    await this.promiseAllPLimit(
      tokensToIndex.map((token) => this.tokensService.indexToken(token)),
      P_LIMIT,
    );
  }

  private async promiseAllPLimit(promises: Promise<any>[], pLimit_: number) {
    const limit = pLimit(pLimit_);
    return await Promise.all(promises.map((promise) => () => limit(() => promise)));
  }
}
