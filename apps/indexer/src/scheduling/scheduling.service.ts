import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LoggerService } from '@libs/logger/logger.service';
import { Cron } from '@nestjs/schedule';
import { PreventOverlap } from '@decorators/prevent-overlap.decorator';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { Log } from 'ethers';
import { ContractTokenTable } from '@db/lukso-data/entities/contract-token.table';

import { EthersService } from '../ethers/ethers.service';
import { TransactionsService } from '../transactions/transactions.service';
import { ContractsService } from '../contracts/contracts.service';
import { EventsService } from '../events/events.service';
import { BLOCKS_P_LIMIT, CRON_PROCESS, EVENTS_FETCH_BLOCKS_LIMIT, P_LIMIT } from '../globals';
import { splitIntoChunks } from '../utils/split-into-chunks';
import { defaultMetadata } from '../ethers/utils/default-metadata-response';
import { MetadataService } from '../metadata/metadata.service';
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
    private readonly metadataService: MetadataService,
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
    let fromBlock = config.latestIndexedBlock + 1;

    // Determine the block number until which we should index in this iteration
    const toBlock = fromBlock + BLOCKS_P_LIMIT > lastBlock ? lastBlock : fromBlock + BLOCKS_P_LIMIT;

    // Function to index all transactions within a block
    const indexBlock = async (blockNumber: number) => {
      // Get transaction hashes for the block
      const transactionsHashes = await this.ethersService.getBlockTransactions(blockNumber);
      this.logger.debug(
        `Indexing ${transactionsHashes.length} transactions from block ${blockNumber}`,
      );

      // Index transactions in batches
      const indexBatchTransactions = async (txHashes: string[]) => {
        for (const txHash of txHashes) await this.transactionsService.indexTransaction(txHash);
      };

      // Split transaction hashes into chunks and process them concurrently
      const transactionHashesChunks = splitIntoChunks(transactionsHashes, P_LIMIT);
      await Promise.all(transactionHashesChunks.map(indexBatchTransactions));
    };

    if (fromBlock < toBlock) {
      this.logger.info(`Indexing transactions from blocks ${fromBlock} to ${toBlock}`);

      // Process blocks in batches and wait for all blocks to finish indexing
      const promises: Promise<void>[] = [];
      for (fromBlock; fromBlock <= toBlock; fromBlock++) {
        promises.push(indexBlock(fromBlock));
      }
      await Promise.all(promises);

      // Update the latest indexed block in the database and logger
      await this.structureDB.updateLatestIndexedBlock(toBlock);
    }
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
    const toBlock =
      fromBlock + EVENTS_FETCH_BLOCKS_LIMIT < lastBlock
        ? fromBlock + EVENTS_FETCH_BLOCKS_LIMIT
        : lastBlock;

    if (fromBlock < toBlock) {
      this.logger.info(`Indexing events from block ${fromBlock} to ${toBlock}`);

      // Retrieve logs from the specified block range
      const logs = await this.ethersService.getPastLogs(fromBlock, toBlock);

      // Split transaction hashes and logs into chunks for batch processing
      const txHashesChunks = splitIntoChunks(
        logs
          .map((log) => log.transactionHash)
          .filter((transactionHash, index, self) => self.indexOf(transactionHash) === index),
        P_LIMIT,
      );
      const logsChunks = splitIntoChunks(logs, P_LIMIT);

      // Functions to index transactions and events in batches
      const indexBatchTransactions = async (txHashes: string[]) => {
        for (const txHash of txHashes) await this.transactionsService.indexTransaction(txHash);
      };
      const indexBatchEvents = async (logs: Log[]) => {
        for (const log of logs) await this.eventsService.indexEvent(log);
      };

      // Process transactions and events in batches concurrently
      await Promise.all([
        Promise.all(logsChunks.map(indexBatchEvents)),
        Promise.all(txHashesChunks.map(indexBatchTransactions)),
      ]);

      // Update the latest indexed event block in the database and logger
      await this.structureDB.updateLatestIndexedEventBlock(toBlock);
    }
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
    // Function to index contracts and their metadata in batches
    const indexBatchContracts = async (contractsToIndex: string[]) => {
      for (const contract of contractsToIndex) {
        this.logger.debug(`Indexing address ${contract}`, { contract });
        // Index the contract and retrieve its row
        const contractRow = await this.contractsService.indexContract(contract);
        if (contractRow) {
          this.logger.debug(`Fetching contract metadata for ${contract}`, { contract });
          // Fetch contract metadata using EthersService
          const metadata = await this.ethersService.fetchContractMetadata(
            contract,
            contractRow.interfaceCode || undefined,
          );

          // Log if no metadata is found, and use defaultMetadata as a fallback
          if (!metadata) this.logger.debug(`No metadata found for ${contract}`, { contract });
          // Index the contract metadata
          await this.metadataService.indexMetadata(metadata || defaultMetadata(contract));
        }
      }
    };

    // Retrieve the list of contracts to be indexed
    const contractsToIndex = await this.dataDB.getContractsToIndex();

    if (contractsToIndex.length > 0)
      this.logger.info(`Processing ${contractsToIndex.length} contracts to index`);
    else this.logger.debug(`Processing ${contractsToIndex.length} contracts to index`);

    // Split contracts into chunks for batch processing
    const contractsChunks = splitIntoChunks(contractsToIndex, P_LIMIT);
    // Process contract chunks concurrently
    await Promise.all(contractsChunks.map(indexBatchContracts));
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
    // Function to index a batch of contracts and their metadata
    const indexBatchTokens = async (tokensToIndex: ContractTokenTable[]) => {
      // Loop through each contract token in the batch
      for (const token of tokensToIndex) await this.tokensService.indexToken(token);
    };

    // Retrieve the list of contract tokens to be indexed
    const tokensToIndex = await this.dataDB.getTokensToIndex();

    if (tokensToIndex.length > 0)
      this.logger.info(`Processing ${tokensToIndex.length} contract tokens to index`);
    else this.logger.debug(`Processing ${tokensToIndex.length} contract tokens to index`);

    // Split the list of contract tokens into chunks for batch processing
    const tokensChunks = splitIntoChunks(tokensToIndex, P_LIMIT);
    await Promise.all(tokensChunks.map(indexBatchTokens));
  }
}
