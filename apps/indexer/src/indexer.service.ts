import { Injectable, OnModuleInit } from '@nestjs/common';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { TransactionTable } from '@db/lukso-data/entities/tx.table';
import { LoggerService } from '@libs/logger/logger.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { ContractTokenTable } from '@db/lukso-data/entities/contract-token.table';
import { WrappedTxTable } from '@db/lukso-data/entities/wrapped-tx.table';
import { ConfigTable } from '@db/lukso-structure/entities/config.table';
import { Log } from 'ethers';

import {
  BLOCKS_INDEXING_BATCH_SIZE,
  CONTRACTS_INDEXING_BATCH_SIZE,
  CONTRACTS_PROCESSING_INTERVAL,
  EVENTS_INDEXING_BATCH_SIZE,
  NODE_ENV,
  TOKENS_INDEXING_BATCH_SIZE,
  TX_INDEXING_BATCH_SIZE,
  IS_TESTING,
} from './globals';
import { EthersService } from './ethers/ethers.service';
import { DecodingService } from './decoding/decoding.service';
import { DecodedParameter } from './decoding/types/decoded-parameter';
import { MetadataResponse } from './ethers/types/metadata-response';
import { defaultMetadata } from './ethers/utils/default-metadata-response';
import { buildLogId } from './utils/build-log-id';
import { splitIntoChunks } from './utils/split-into-chunks';
import { BlockchainActionRouterService } from './blockchain-action-router/blockchain-action-router.service';
import { IndexingWsGateway } from './indexing-ws/indexing-ws.gateway';

/**
 * IndexerService class that is responsible for indexing transactions from the blockchain and persisting them to the database.
 */
@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger: winston.Logger;

  constructor(
    private readonly structureDB: LuksoStructureDbService,
    private readonly dataDB: LuksoDataDbService,
    private readonly ethersService: EthersService,
    private readonly decodingService: DecodingService,
    private readonly loggerService: LoggerService,
    private readonly actionRouter: BlockchainActionRouterService,
    private readonly indexingWebSocket: IndexingWsGateway,
  ) {
    this.logger = loggerService.getChildLogger('Indexing');
    this.logger.info('Indexer starting...');
  }
  onModuleInit() {
    if (NODE_ENV !== 'test') {
      this.indexByBlock().then();
      this.indexByEvents().then();
      this.processContractsToIndex().then();
      this.processContractTokensToIndex().then();
    }
  }

  /**
   * Indexes data from blocks in a batch-wise manner.
   * This method is designed to handle large numbers of blocks by breaking them into smaller batches.
   * It indexes transactions within blocks and updates the latest indexed block in the database.
   * The method will recursively call itself after a specified timeout.
   */
  protected async indexByBlock() {
    const startTime = new Date();
    let lastBlock = 0;
    let toBlock = 0;
    let config: ConfigTable | null = null;

    try {
      // Retrieve configuration and block data
      config = await this.structureDB.getConfig();
      lastBlock = await this.ethersService.getLastBlock();
      let fromBlock = config.latestIndexedBlock + 1;

      // Determine the block number until which we should index in this iteration
      toBlock =
        fromBlock + BLOCKS_INDEXING_BATCH_SIZE > lastBlock
          ? lastBlock
          : fromBlock + BLOCKS_INDEXING_BATCH_SIZE;

      // Function to index all transactions within a block
      const indexBlock = async (blockNumber: number) => {
        // Get transaction hashes for the block
        const transactionsHashes = await this.ethersService.getBlockTransactions(blockNumber);
        this.logger.debug(
          `Indexing ${transactionsHashes.length} transactions from block ${blockNumber}`,
        );

        // Index transactions in batches
        const indexBatchTransactions = async (txHashes: string[]) => {
          for (const txHash of txHashes) await this.indexTransaction(txHash);
        };

        // Split transaction hashes into chunks and process them concurrently
        const transactionHashesChunks = splitIntoChunks(transactionsHashes, TX_INDEXING_BATCH_SIZE);
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
    } catch (e) {
      this.logger.error(`Error while indexing data from blocks: ${e.message}`);
    }

    // Calculate the timeout for the next recursive call based on the current indexing progress
    const timeout =
      lastBlock === toBlock && config
        ? Math.max(
            0,
            config.sleepBetweenIteration - Number(new Date().getTime() - startTime.getTime()),
          )
        : 0;

    // Recursively call this function after the calculated timeout
    this.setRecursiveTimeout(this.indexByBlock.bind(this), timeout);
  }

  /**
   * Indexes events by retrieving past logs from the latest indexed event block up to a specified block.
   * This method is designed to handle large numbers of events by breaking them into smaller batches.
   * It indexes transactions and events associated with logs and updates the latest indexed event block in the database.
   * The method will recursively call itself after a specified timeout.
   */
  protected async indexByEvents() {
    const startTime = new Date();
    let config: ConfigTable | null = null;
    let lastBlock = 0;
    let toBlock = 0;

    try {
      // Retrieve configuration and block data
      config = await this.structureDB.getConfig();
      const fromBlock: number = config.latestIndexedEventBlock + 1;

      lastBlock = await this.ethersService.getLastBlock();
      // Determine the block number until which we should index in this iteration
      toBlock =
        fromBlock + config.blockIteration < lastBlock
          ? fromBlock + config.blockIteration
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
      }
    } catch (e) {
      this.logger.error(`Error while indexing data: ${e.message}`);
    }

    // Calculate the timeout for the next recursive call based on the current indexing progress
    const timeout =
      lastBlock === toBlock && config
        ? Math.max(
            0,
            config.sleepBetweenIteration - Number(new Date().getTime() - startTime.getTime()),
          )
        : 0;
    // Recursively call this function after the calculated timeout
    this.setRecursiveTimeout(this.indexByEvents.bind(this), timeout);
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
    const startTime = new Date();

    try {
      // Function to index contracts and their metadata in batches
      const indexBatchContracts = async (contractsToIndex: string[]) => {
        for (const contract of contractsToIndex) {
          this.logger.debug(`Indexing address ${contract}`, { contract });
          // Index the contract and retrieve its row
          const contractRow = await this.indexContract(contract);
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
            await this.indexMetadata(metadata || defaultMetadata(contract));
          }
        }
      };

      // Retrieve the list of contracts to be indexed
      const contractsToIndex = await this.dataDB.getContractsToIndex();

      if (contractsToIndex.length > 0)
        this.logger.info(`Processing ${contractsToIndex.length} contracts to index`);
      else this.logger.debug(`Processing ${contractsToIndex.length} contracts to index`);

      // Split contracts into chunks for batch processing
      const contractsChunks = splitIntoChunks(contractsToIndex, CONTRACTS_INDEXING_BATCH_SIZE);
      // Process contract chunks concurrently
      await Promise.all(contractsChunks.map(indexBatchContracts));
    } catch (e) {
      this.logger.error(`Error while processing contracts to index: ${e.message}`);
    }

    // Calculate the timeout for the next recursive call based on the current processing progress
    const timeout = Math.max(
      0,
      CONTRACTS_PROCESSING_INTERVAL - Number(new Date().getTime() - startTime.getTime()),
    );
    // Recursively call this function after the calculated timeout
    this.setRecursiveTimeout(this.processContractsToIndex.bind(this), timeout);
  }

  /**
   * Processes contract tokens to be indexed in batches. The function retrieves the list of contract tokens,
   * splits them into chunks, and indexes each chunk concurrently. After the process is completed, it schedules
   * the next execution of the function based on a calculated timeout.
   */
  protected async processContractTokensToIndex() {
    const startTime = new Date();

    try {
      // Function to index a batch of contracts and their metadata
      const indexBatchTokens = async (tokensToIndex: ContractTokenTable[]) => {
        // Loop through each contract token in the batch
        for (const token of tokensToIndex) {
          this.logger.debug(`Indexing token ${token.tokenId} from ${token.address}`, { ...token });

          // Fetch the metadata of the contract token
          const tokenData = await this.ethersService.fetchContractTokenMetadata(
            token.address,
            token.tokenId,
          );

          // If metadata is available, insert or update the token in the database
          // and index the metadata
          if (tokenData) {
            await this.dataDB.insertContractToken(
              {
                ...token,
                decodedTokenId: tokenData.decodedTokenId,
              },
              'update',
            );
            await this.indexMetadata(tokenData.metadata);
          } else {
            this.logger.debug(
              `No metadata found for token ${token.tokenId} from ${token.address}`,
              { ...token },
            );
            await this.dataDB.insertContractToken(
              {
                ...token,
                decodedTokenId: token.tokenId,
              },
              'update',
            );
          }
        }
      };

      // Retrieve the list of contract tokens to be indexed
      const tokensToIndex = await this.dataDB.getTokensToIndex();

      if (tokensToIndex.length > 0)
        this.logger.info(`Processing ${tokensToIndex.length} contract tokens to index`);
      else this.logger.debug(`Processing ${tokensToIndex.length} contract tokens to index`);

      // Split the list of contract tokens into chunks for batch processing
      const tokensChunks = splitIntoChunks(tokensToIndex, TOKENS_INDEXING_BATCH_SIZE);
      await Promise.all(tokensChunks.map(indexBatchTokens));
    } catch (e) {
      this.logger.error(`Error while processing contracts to index: ${e.message}`);
    }

    // Calculate the timeout for the next recursive call based on the current processing progress
    const timeout = Math.max(
      0,
      CONTRACTS_PROCESSING_INTERVAL - Number(new Date().getTime() - startTime.getTime()),
    );
    // Recursively call this function after the calculated timeout
    this.setRecursiveTimeout(this.processContractTokensToIndex.bind(this), timeout);
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
      this.logger.debug(`Indexing transaction ${transactionHash}`, { transactionHash });

      // Check if the transaction has already been indexed
      const transactionAlreadyIndexed = await this.dataDB.getTransactionByHash(transactionHash);
      if (transactionAlreadyIndexed) {
        this.logger.debug(`Transaction ${transactionHash} already indexed, exiting...`, {
          transactionHash,
        });
        return;
      }

      // Retrieve the transaction details using EthersService
      const transaction = await this.ethersService.getTransaction(transactionHash);
      const transactionReceipt = await this.ethersService.getTransactionReceipt(transactionHash);

      // Extract the method ID from the transaction input
      const methodId = transaction.data.slice(0, 10);
      // Decode the transaction input using DecodingService
      const decodedTxInput = await this.decodingService.decodeTransactionInput(transaction.data);

      const blockNumber = transaction.blockNumber ?? 0;
      const timestamp = await this.ethersService.getBlockTimestamp(blockNumber);

      // Create a transaction row object with the retrieved and decoded data
      const transactionRow: TransactionTable = {
        ...transaction,
        methodId,
        blockHash: transaction.blockHash ?? '',
        blockNumber,
        date: new Date(timestamp),
        transactionIndex: transaction.index ?? 0,
        to: transaction.to ?? '',
        methodName: decodedTxInput?.methodName || null,
        gas: parseInt(transactionReceipt.gasUsed.toString()),
        value: transaction.value.toString(),
        gasPrice: transaction.gasPrice.toString(),
      };

      // Insert the contracts if they don't exist without an interface, so they will be treated by the other recursive process
      await this.dataDB.insertContract(
        { address: transaction.from, interfaceVersion: null, interfaceCode: null, type: null },
        'do nothing',
      );
      if (transaction.to)
        await this.dataDB.insertContract(
          { address: transaction.to, interfaceVersion: null, interfaceCode: null, type: null },
          'do nothing',
        );

      // Insert the transaction row into the database
      await this.dataDB.insertTransaction(transactionRow);

      // Insert transaction input into the database
      await this.dataDB.insertTransactionInput({ transactionHash, input: transaction.data });

      // If decoded input parameters are present, process them further
      if (decodedTxInput?.parameters) {
        // Insert transaction parameters into the database
        await this.dataDB.insertTransactionParameters(
          transactionHash,
          decodedTxInput.parameters,
          'do nothing',
        );

        await this.actionRouter.routeTransaction(
          transactionRow.from,
          transactionRow.to,
          transactionRow.blockNumber,
          transactionRow.methodId,
          decodedTxInput.parameters,
        );

        // Index wrapped transactions based on the input parameters
        await this.indexWrappedTransactions(
          transaction.data,
          transactionRow.blockNumber,
          decodedTxInput.parameters,
          transactionRow.to,
          null,
          transactionHash,
        );
      }
    } catch (e) {
      this.logger.error(`Error while indexing transaction: ${e.message}`, {
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
      this.logger.debug(`Indexing log ${log.transactionHash}:${log.index}`, {
        transactionHash: log.transactionHash,
        logIndex: log.index,
      });

      // Generate a unique log ID based on the transaction hash and log index
      const logId = buildLogId(log.transactionHash, log.index);

      // Extract the method ID from the log topics
      const methodId = log.topics[0].slice(0, 10);

      // Check if the event has already been indexed
      const eventAlreadyIndexed = await this.dataDB.getEventById(logId);
      if (eventAlreadyIndexed) {
        this.logger.debug(`Log ${log.transactionHash}:${log.index} already indexed, exiting...`, {
          transactionHash: log.transactionHash,
          logIndex: log.index,
        });
        return;
      }

      // Retrieve the event interface using the method ID
      const eventInterface = await this.structureDB.getMethodInterfaceById(methodId);

      const timestamp = await this.ethersService.getBlockTimestamp(log.blockNumber);

      const eventRow: EventTable = {
        ...log,
        logIndex: log.index,
        date: new Date(timestamp),
        id: logId,
        eventName: eventInterface?.name || null,
        methodId,
        topic0: log.topics[0],
        topic1: log.topics.length > 1 ? log.topics[1] : null,
        topic2: log.topics.length > 2 ? log.topics[2] : null,
        topic3: log.topics.length > 3 ? log.topics[3] : null,
      };

      // Insert the event data into the database
      await this.dataDB.insertEvent(eventRow);

      // Insert the contract without interface if it doesn't exist, so it will be treated by the other recursive process
      await this.dataDB.insertContract(
        { address: log.address, interfaceVersion: null, interfaceCode: null, type: null },
        'do nothing',
      );

      // Decode the log parameters using DecodingService
      const decodedParameters = await this.decodingService.decodeLogParameters(log.data, [
        ...log.topics,
      ]);

      this.indexingWebSocket.emitEvent(eventRow, decodedParameters || []);

      // If decoded parameters are present, insert them into the database
      if (decodedParameters) {
        await this.dataDB.insertEventParameters(logId, decodedParameters, 'do nothing');
        await this.actionRouter.routeEvent(eventRow, decodedParameters);
      }
    } catch (e) {
      this.logger.error(`Error while indexing log: ${e.message}`, {
        transactionHash: log.transactionHash,
        logIndex: log.index,
        stack: e.stack,
      });
    }
  }

  /**
   * Recursively indexes wrapped transactions that are part of a larger transaction.
   * This method handles indexing of wrapped transactions by unwrapping them, inserting transaction data
   * into the database, and recursively indexing any nested wrapped transactions.
   *
   * @param {string} input - The input data of the transaction.
   * @param blockNumber
   * @param {DecodedParameter[]} decodedParams - The decoded input parameters of the transaction.
   * @param {string} contractAddress - The contract address of the transaction where the transaction was executed.
   * @param {number|null} parentId - The parent ID of the wrapped transaction.
   * @param {string} transactionHash - The hash of the parent transaction.
   */
  protected async indexWrappedTransactions(
    input: string,
    blockNumber: number,
    decodedParams: DecodedParameter[],
    contractAddress: string,
    parentId: number | null,
    transactionHash: string,
  ) {
    this.logger.debug(
      `Indexing wrapped transactions from the ${transactionHash} with parentID ${parentId}`,
      {
        parentId,
        transactionHash,
      },
    );

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

          const wrappedTxRow: Omit<WrappedTxTable, 'id'> = {
            blockNumber,
            from: contractAddress,
            to: unwrappedTransaction.to,
            value: unwrappedTransaction.value,
            parentId: parentId,
            transactionHash,
            methodId: unwrappedTransaction.input.slice(0, 10),
            methodName: unwrappedTransaction.methodName,
          };
          const { id } = await this.dataDB.insertWrappedTx(wrappedTxRow);

          // Insert the contract without interface if it doesn't exist, so it will be treated by the other recursive process
          await this.dataDB.insertContract(
            {
              address: unwrappedTransaction.to,
              interfaceVersion: null,
              interfaceCode: null,
              type: null,
            },
            'do nothing',
          );

          // Insert the wrapped transaction input data into the database
          await this.dataDB.insertWrappedTxInput({
            wrappedTransactionId: id,
            input: unwrappedTransaction.input,
          });

          // Insert the wrapped transaction parameters into the database
          await this.dataDB.insertWrappedTxParameters(
            id,
            unwrappedTransaction.parameters,
            'do nothing',
          );

          await this.actionRouter.routeTransaction(
            wrappedTxRow.from,
            wrappedTxRow.to,
            wrappedTxRow.blockNumber,
            wrappedTxRow.methodId,
            unwrappedTransaction.parameters,
          );

          // Recursively index any nested wrapped transactions within the current wrapped transaction
          await this.indexWrappedTransactions(
            unwrappedTransaction.input,
            wrappedTxRow.blockNumber,
            unwrappedTransaction.parameters,
            unwrappedTransaction.to,
            id,
            transactionHash,
          );
        }
      }
    } catch (e) {
      this.logger.error(`Failed to index wrapped transactions: ${e.message}`, {
        stack: e.stack,
        input,
        decodedParams,
        contractAddress,
        parentId,
        transactionHash,
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
      this.logger.debug(`Indexing address ${address}`, { address });

      // Check if the contract has already been indexed (contract indexed only if interfaceCode is set)
      const contractAlreadyIndexed = await this.dataDB.getContractByAddress(address);
      if (contractAlreadyIndexed && contractAlreadyIndexed?.interfaceCode) {
        this.logger.debug(`Contract already indexed: ${address}`, { address });
        return;
      }

      // Identify the contract interface using its address
      const contractInterface = await this.ethersService.identifyContractInterface(address);

      this.logger.debug(`Contract interface identified: ${contractInterface?.code ?? 'unknown'}`, {
        address,
      });

      // Prepare the contract data to be inserted into the database
      const contractRow: ContractTable = {
        address,
        interfaceCode: contractInterface?.code ?? 'unknown',
        interfaceVersion: contractInterface?.version ?? null,
        type: contractInterface?.type ?? null,
      };

      // Insert contract, and update on conflict
      await this.dataDB.insertContract(contractRow, 'update');

      return contractRow;
    } catch (e) {
      this.logger.error(`Error while indexing contract: ${e.message}`, { address });
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
      this.logger.error(`Error while indexing metadata: ${e.message}`, {
        address: metadata.metadata.address,
        tokenId: metadata.metadata.tokenId,
      });
    }
  }

  private setRecursiveTimeout(func: () => void, timeout: number) {
    if (IS_TESTING) return;
    else setTimeout(func, timeout); // Trigger the internal execution of 'func' through resolve() using setTimeout after 'timeout' milliseconds
  }
}
