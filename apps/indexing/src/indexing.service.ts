import { Injectable, OnModuleInit } from '@nestjs/common';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { TransactionTable } from '@db/lukso-data/entities/tx.table';
import { LoggerService } from '@libs/logger/logger.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { Log } from 'web3-core';

import {
  BLOCKS_INDEXING_BATCH_SIZE,
  CONTRACTS_INDEXING_BATCH_SIZE,
  CONTRACTS_PROCESSING_INTERVAL,
  EVENTS_INDEXING_BATCH_SIZE,
  NODE_ENV,
  TX_INDEXING_BATCH_SIZE,
} from './globals';
import { Web3Service } from './web3/web3.service';
import { DecodingService } from './decoding/decoding.service';
import { DecodedParameter } from './decoding/types/decoded-parameter';
import { MetadataResponse } from './web3/types/metadata-response';
import { defaultMetadata } from './web3/utils/default-metadata-response';
import { buildLogId } from './utils/build-log-id';
import { splitIntoChunks } from './utils/split-into-chunks';

/**
 * IndexingService class that is responsible for indexing transactions from the blockchain and persisting them to the database.
 */
@Injectable()
export class IndexingService implements OnModuleInit {
  private readonly fileLogger: winston.Logger;

  constructor(
    private readonly structureDB: LuksoStructureDbService,
    private readonly dataDB: LuksoDataDbService,
    private readonly web3Service: Web3Service,
    private readonly decodingService: DecodingService,
    private readonly logger: LoggerService,
  ) {
    this.fileLogger = logger.getChildLogger('Indexing');
  }
  onModuleInit() {
    if (NODE_ENV !== 'test') {
      this.indexByBlock().then();
      this.processContractsToIndex().then();
      this.indexByEvents().then();
    }
  }

  /**
   * Indexes data from blocks in a batch-wise manner.
   * This method is designed to handle large numbers of blocks by breaking them into smaller batches.
   * It indexes transactions within blocks and updates the latest indexed block in the database.
   * The method will recursively call itself after a specified timeout.
   */
  protected async indexByBlock() {
    try {
      const startTime = new Date();

      // Retrieve configuration and block data
      const config = await this.structureDB.getConfig();
      const lastBlock = await this.web3Service.getLastBlock();

      // Set logger values
      this.logger.setLastBlock(lastBlock);
      this.logger.setLatestIndexedBlock(config.latestIndexedBlock);

      // Function to index all transactions within a block
      const indexBlock = async (blockNumber: number) => {
        this.fileLogger.info(`Indexing data of block ${blockNumber}`, { block: blockNumber });

        // Get transaction hashes for the block
        const transactionsHashes = await this.web3Service.getBlockTransactions(blockNumber);

        // Index transactions in batches
        const indexBatchTransactions = async (txHashes: string[]) => {
          for (const txHash of txHashes) await this.indexTransaction(txHash);
        };

        // Split transaction hashes into chunks and process them concurrently
        const transactionHashesChunks = splitIntoChunks(transactionsHashes, TX_INDEXING_BATCH_SIZE);
        await Promise.all(transactionHashesChunks.map(indexBatchTransactions));
      };

      // Determine the block number until which we should index in this iteration
      const indexUntilBlock =
        config.latestIndexedBlock + BLOCKS_INDEXING_BATCH_SIZE + 1 > lastBlock
          ? lastBlock
          : config.latestIndexedBlock + BLOCKS_INDEXING_BATCH_SIZE + 1;

      // Process blocks in batches and wait for all blocks to finish indexing
      const promises: Promise<void>[] = [];
      for (
        let blockToIndex = config.latestIndexedBlock + 1;
        blockToIndex <= indexUntilBlock;
        blockToIndex++
      ) {
        promises.push(indexBlock(blockToIndex));
      }
      await Promise.all(promises);

      // Update the latest indexed block in the database and logger
      await this.structureDB.updateLatestIndexedBlock(indexUntilBlock);
      this.logger.setLatestIndexedBlock(indexUntilBlock);

      // Calculate the timeout for the next recursive call based on the current indexing progress
      const timeout =
        lastBlock === indexUntilBlock
          ? Math.max(
              0,
              config.sleepBetweenIteration - Number(new Date().getTime() - startTime.getTime()),
            )
          : 0;
      // Recursively call this function after the calculated timeout
      this.setRecursiveTimeout(this.indexByBlock.bind(this), timeout);
    } catch (e) {
      this.fileLogger.error(`Error while indexing data from blocks: ${e.message}`);
    }
  }

  /**
   * Indexes events by retrieving past logs from the latest indexed event block up to a specified block.
   * This method is designed to handle large numbers of events by breaking them into smaller batches.
   * It indexes transactions and events associated with logs and updates the latest indexed event block in the database.
   * The method will recursively call itself after a specified timeout.
   */
  protected async indexByEvents() {
    try {
      const startTime = new Date();

      // Retrieve configuration and block data
      const config = await this.structureDB.getConfig();
      this.logger.setLatestIndexedEventBlock(config.latestIndexedEventBlock);

      const lastBlock = await this.web3Service.getLastBlock();
      // Determine the block number until which we should index in this iteration
      const toBlock =
        config.latestIndexedEventBlock + config.blockIteration < lastBlock
          ? config.latestIndexedEventBlock + config.blockIteration
          : lastBlock;

      this.fileLogger.info(`Indexing from blocks ${config.latestIndexedEventBlock} to ${toBlock}`);

      // Retrieve logs from the specified block range
      const logs = await this.web3Service.getPastLogs(config.latestIndexedEventBlock, toBlock);

      // Split transaction hashes and logs into chunks for batch processing
      const txHashesChunks = splitIntoChunks(
        logs
          .map((log) => log.transactionHash)
          .filter((transactionHash, index, self) => self.indexOf(transactionHash) === index),
        TX_INDEXING_BATCH_SIZE,
      );
      const logsChunks = splitIntoChunks(logs, EVENTS_INDEXING_BATCH_SIZE);

      // Functions to index transactions and events in batches
      const indexBatchTransactions = async (txHashes: string[]) => {
        for (const txHash of txHashes) await this.indexTransaction(txHash);
      };
      const indexBatchEvents = async (logs: Log[]) => {
        for (const log of logs) await this.indexEvent(log);
      };

      // Process transactions and events in batches concurrently
      await Promise.all([
        Promise.all(logsChunks.map(indexBatchEvents)),
        Promise.all(txHashesChunks.map(indexBatchTransactions)),
      ]);

      // Update the latest indexed event block in the database and logger
      await this.structureDB.updateLatestIndexedEventBlock(toBlock);
      this.logger.setLatestIndexedEventBlock(toBlock);

      // Calculate the timeout for the next recursive call based on the current indexing progress
      const timeout =
        lastBlock === toBlock
          ? Math.max(
              0,
              config.sleepBetweenIteration - Number(new Date().getTime() - startTime.getTime()),
            )
          : 0;
      // Recursively call this function after the calculated timeout
      this.setRecursiveTimeout(this.indexByEvents.bind(this), timeout);
    } catch (e) {
      this.fileLogger.error(`Error while indexing data: ${e.message}`);
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
  protected async processContractsToIndex() {
    try {
      const startTime = new Date();

      // Function to index contracts and their metadata in batches
      const indexBatchContracts = async (contractsToIndex: string[]) => {
        for (const contract of contractsToIndex) {
          this.fileLogger.info('Indexing contract', { contractAddress: contract });
          // Index the contract and retrieve its row
          const contractRow = await this.indexContract(contract);
          if (contractRow) {
            this.fileLogger.info(`Fetching contract metadata for ${contract}`, { contract });
            // Fetch contract metadata using Web3Service
            const metadata = await this.web3Service.fetchContractMetadata(
              contract,
              contractRow.interfaceCode || undefined,
            );

            // Log if no metadata is found, and use defaultMetadata as a fallback
            if (!metadata) this.fileLogger.info(`No metadata found for ${contract}`, { contract });
            // Index the contract metadata
            await this.indexMetadata(metadata || defaultMetadata(contract));
          }
        }
      };

      // Retrieve the list of contracts to be indexed
      const contractsToIndex = await this.dataDB.getContractsToIndex();

      // Split contracts into chunks for batch processing
      const logsChunks = splitIntoChunks(contractsToIndex, CONTRACTS_INDEXING_BATCH_SIZE);
      // Process contract chunks concurrently
      await Promise.all(logsChunks.map(indexBatchContracts));

      // Calculate the timeout for the next recursive call based on the current processing progress
      const timeout = Math.max(
        0,
        CONTRACTS_PROCESSING_INTERVAL - Number(new Date().getTime() - startTime.getTime()),
      );
      // Recursively call this function after the calculated timeout
      this.setRecursiveTimeout(this.processContractsToIndex.bind(this), timeout);
    } catch (e) {
      this.fileLogger.error(`Error while processing contracts to index: ${e.message}`);
    }
  }

  /**
   * Indexes a transaction to the LuksoData database.
   * This method handles transaction indexing by checking if the transaction has already been indexed,
   * retrieving transaction details, decoding transaction input, and updating the database accordingly.
   *
   * @param {string} transactionHash - The transaction hash to index.
   */
  protected async indexTransaction(transactionHash: string) {
    try {
      // Check if the transaction has already been indexed
      const transactionAlreadyIndexed = await this.dataDB.getTransactionByHash(transactionHash);
      if (transactionAlreadyIndexed) return;

      this.fileLogger.info('Indexing transaction', { transactionHash });

      // Retrieve the transaction details using Web3Service
      const transaction = await this.web3Service.getTransaction(transactionHash);
      if (!transaction) return;

      // Extract the method ID from the transaction input
      const methodId = transaction.input.slice(0, 10);
      // Decode the transaction input using DecodingService
      const decodedTxInput = await this.decodingService.decodeTransactionInput(transaction.input);

      // Create a transaction row object with the retrieved and decoded data
      const transactionRow: TransactionTable = {
        ...transaction,
        methodId,
        blockHash: transaction.blockHash ?? '',
        blockNumber: transaction.blockNumber ?? 0,
        transactionIndex: transaction.transactionIndex ?? 0,
        to: transaction.to ?? '',
        methodName: decodedTxInput?.methodName || null,
      };

      // Insert the contracts if they don't exist without an interface, so they will be treated by the other recursive process
      await this.dataDB.insertContract(
        { address: transaction.from, interfaceVersion: null, interfaceCode: null },
        'do nothing',
      );
      if (transaction.to)
        await this.dataDB.insertContract(
          { address: transaction.to, interfaceVersion: null, interfaceCode: null },
          'do nothing',
        );

      // Insert the transaction row into the database
      await this.dataDB.insertTransaction(transactionRow);
      // Update the logger with the indexed transaction count
      this.logger.incrementIndexedCount('transaction');

      // Insert transaction input into the database
      await this.dataDB.insertTransactionInput({ transactionHash, input: transaction.input });

      // If decoded input parameters are present, process them further
      if (decodedTxInput?.parameters) {
        // Insert transaction parameters into the database
        await this.dataDB.insertTransactionParameters(
          transactionHash,
          decodedTxInput.parameters,
          'do nothing',
        );

        // Index wrapped transactions based on the input parameters
        await this.indexWrappedTransactions(
          transaction.input,
          decodedTxInput.parameters,
          transactionRow.to,
          null,
          transactionHash,
        );
      }
    } catch (e) {
      this.fileLogger.error(`Error while indexing transaction: ${e.message}`, {
        transactionHash,
        stack: e.stack,
      });
    }
  }

  /**
   * Indexes a single event log entry.
   * This method handles event log indexing by checking if the event has already been indexed,
   * retrieving event details, decoding event parameters, and updating the database accordingly.
   *
   * @param {Log} log - The log object containing event data.
   */
  protected async indexEvent(log: Log) {
    try {
      // Generate a unique log ID based on the transaction hash and log index
      const logId = buildLogId(log.transactionHash, log.logIndex);
      // Extract the method ID from the log topics
      const methodId = log.topics[0].slice(0, 10);

      // Check if the event has already been indexed
      const eventAlreadyIndexed = await this.dataDB.getEventById(logId);
      if (eventAlreadyIndexed) return;

      this.fileLogger.info('Indexing log', { ...log });

      // Retrieve the event interface using the method ID
      const eventInterface = await this.structureDB.getMethodInterfaceById(methodId);
      // Insert the event data into the database
      await this.dataDB.insertEvent({
        ...log,
        id: logId,
        eventName: eventInterface?.name || null,
        methodId,
        topic0: log.topics[0],
        topic1: log.topics.length > 1 ? log.topics[1] : null,
        topic2: log.topics.length > 2 ? log.topics[2] : null,
        topic3: log.topics.length > 3 ? log.topics[3] : null,
      });

      // Update the logger with the indexed event count
      this.logger.incrementIndexedCount('event');

      // Insert the contract without interface if it doesn't exist, so it will be treated by the other recursive process
      await this.dataDB.insertContract(
        { address: log.address, interfaceVersion: null, interfaceCode: null },
        'do nothing',
      );

      // Decode the log parameters using DecodingService
      const decodedParameters = await this.decodingService.decodeLogParameters(
        log.data,
        log.topics,
      );

      // If decoded parameters are present, insert them into the database
      if (decodedParameters)
        await this.dataDB.insertEventParameters(logId, decodedParameters, 'do nothing');
    } catch (e) {
      this.fileLogger.error(`Error while indexing log: ${e.message}`, { ...log });
    }
  }

  /**
   * Recursively indexes wrapped transactions that are part of a larger transaction.
   * This method handles indexing of wrapped transactions by unwrapping them, inserting transaction data
   * into the database, and recursively indexing any nested wrapped transactions.
   *
   * @param {string} input - The input data of the transaction.
   * @param {DecodedParameter[]} decodedParams - The decoded input parameters of the transaction.
   * @param {string} contractAddress - The contract address of the transaction where the transaction was executed.
   * @param {number|null} parentId - The parent ID of the wrapped transaction.
   * @param {string|null} parentTxHash - The hash of the parent transaction.
   */
  protected async indexWrappedTransactions(
    input: string,
    decodedParams: DecodedParameter[],
    contractAddress: string,
    parentId: number | null,
    parentTxHash: string | null,
  ) {
    this.fileLogger.info('Indexing wrapped transactions', { parentId, parentTxHash });

    try {
      // Unwrap the transaction to identify any wrapped transactions within the current transaction
      const unwrappedTransactions = await this.decodingService.unwrapTransaction(
        input.slice(0, 10),
        decodedParams,
        contractAddress,
      );

      // If there are wrapped transactions, process and insert them into the database
      if (unwrappedTransactions) {
        for (const unwrappedTransaction of unwrappedTransactions) {
          // Insert the wrapped transaction data into the database
          const row = await this.dataDB.insertWrappedTx({
            from: contractAddress,
            to: unwrappedTransaction.to,
            value: unwrappedTransaction.value,
            parentId: parentId,
            parentTransactionHash: parentTxHash,
            methodId: unwrappedTransaction.input.slice(0, 10),
            methodName: unwrappedTransaction.methodName,
          });

          // Insert the contract without interface if it doesn't exist, so it will be treated by the other recursive process
          await this.dataDB.insertContract(
            { address: unwrappedTransaction.to, interfaceVersion: null, interfaceCode: null },
            'do nothing',
          );

          // Insert the wrapped transaction input data into the database
          await this.dataDB.insertWrappedTxInput({
            wrappedTransactionId: row.id,
            input: unwrappedTransaction.input,
          });

          // Insert the wrapped transaction parameters into the database
          await this.dataDB.insertWrappedTxParameters(
            row.id,
            unwrappedTransaction.parameters,
            'do nothing',
          );

          // Recursively index any nested wrapped transactions within the current wrapped transaction
          await this.indexWrappedTransactions(
            unwrappedTransaction.input,
            unwrappedTransaction.parameters,
            unwrappedTransaction.to,
            row.id,
            null,
          );
        }
      }
    } catch (e) {
      this.fileLogger.error(`Failed to index wrapped transactions: ${e.message}`, {
        input,
        decodedParams,
        contractAddress,
        parentId,
        parentTxHash,
      });
    }
  }

  /**
   * Indexes a contract by its address and retrieves its interface.
   *
   * @param {string} address - The contract address to index.
   * @returns {Promise<ContractTable | undefined>} The indexed contract data, or undefined if an error occurs.
   */
  protected async indexContract(address: string): Promise<ContractTable | undefined> {
    try {
      // Check if the contract has already been indexed (contract indexed only if interfaceCode is set)
      const contractAlreadyIndexed = await this.dataDB.getContractByAddress(address);
      if (contractAlreadyIndexed && contractAlreadyIndexed?.interfaceCode) return;

      this.fileLogger.info('Indexing contract', { address });

      // Identify the contract interface using its address
      const contractInterface = await this.web3Service.identifyContractInterface(address);

      this.fileLogger.info(
        `Contract interface identified: ${contractInterface?.code ?? 'unknown'}`,
        { address },
      );

      // Prepare the contract data to be inserted into the database
      const contractRow: ContractTable = {
        address,
        interfaceCode: contractInterface?.code ?? 'unknown',
        interfaceVersion: contractInterface?.version ?? null,
      };

      // Insert contract, and update on conflict
      await this.dataDB.insertContract(contractRow, 'update');
      this.logger.incrementIndexedCount('contract');

      return contractRow;
    } catch (e) {
      this.fileLogger.error(`Error while indexing contract: ${e.message}`, { address });
    }
  }

  /**
   * Indexes metadata of a contract, including images, tags, links, and assets.
   *
   * @param {MetadataResponse} metadata - The metadata object containing data to be indexed.
   * @returns {Promise<void>}
   */
  protected async indexMetadata(metadata: MetadataResponse): Promise<void> {
    try {
      // Insert the main metadata and retrieve the generated ID
      const { id } = await this.dataDB.insertMetadata(metadata.metadata);

      // Insert related metadata objects into the database
      await this.dataDB.insertMetadataImages(id, metadata.images, 'do nothing');
      await this.dataDB.insertMetadataTags(id, metadata.tags, 'do nothing');
      await this.dataDB.insertMetadataLinks(id, metadata.links, 'do nothing');
      await this.dataDB.insertMetadataAssets(id, metadata.assets, 'do nothing');
    } catch (e) {
      this.fileLogger.error(`Error while indexing metadata: ${e.message}`, {
        address: metadata.metadata.address,
        tokenId: metadata.metadata.tokenId,
      });
    }
  }

  private setRecursiveTimeout(func: () => void, timeout: number) {
    if (NODE_ENV === 'test') return;
    setTimeout(() => {
      func();
    }, timeout);
  }
}
