import { Injectable, OnModuleInit } from '@nestjs/common';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { TransactionTable } from '@db/lukso-data/entities/tx.table';
import { LoggerService } from '@libs/logger/logger.service';

import { NODE_ENV } from './globals';
import { Web3Service } from './web3/web3.service';
import { DecodingService } from './decoding/decoding.service';
import { DecodedParameter } from './decoding/types/decoded-parameter';

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
    }
  }

  /**
   * Recursively indexes transactions from the blockchain by blocks.
   */
  protected async indexByBlock() {
    const startTime = new Date();

    const config = await this.structureDB.getConfig();
    const lastBlock = await this.web3Service.getLastBlock();

    this.logger.setLastBlock(lastBlock);
    this.logger.setLatestIndexedBlock(config.latestIndexedBlock);

    const blockToIndex =
      config.latestIndexedBlock + 1 > lastBlock ? lastBlock : config.latestIndexedBlock + 1;

    this.fileLogger.info(`Indexing data from block ${blockToIndex}`, { block: blockToIndex });

    const transactionsHashes = await this.web3Service.getBlockTransactions(blockToIndex);

    for (const transactionHash of transactionsHashes) await this.indexTransaction(transactionHash);

    await this.structureDB.updateLatestIndexedBlock(blockToIndex);
    this.logger.setLatestIndexedBlock(blockToIndex);

    // Recursively call this function after a timeout
    const timeout =
      lastBlock === blockToIndex
        ? Math.max(
            0,
            config.sleepBetweenIteration - Number(new Date().getTime() - startTime.getTime()),
          )
        : 0;

    setTimeout(this.indexByBlock.bind(this), timeout);
  }

  /**
   * Indexes a transaction to the LuksoData database.
   *
   * @param {string} transactionHash - The transaction hash to index.
   */
  protected async indexTransaction(transactionHash: string) {
    // Check if the transaction have already been indexed
    const transactionAlreadyIndexed = await this.dataDB.getTransactionByHash(transactionHash);
    if (transactionAlreadyIndexed) return;

    this.fileLogger.info('Indexing transaction', { transactionHash });

    try {
      const transaction = await this.web3Service.getTransaction(transactionHash);
      const methodId = transaction.input.slice(0, 10);
      const decodedTxInput = await this.decodingService.decodeTransactionInput(transaction.input);

      const transactionRow: TransactionTable = {
        ...transaction,
        methodId,
        blockHash: transaction.blockHash ?? '',
        blockNumber: transaction.blockNumber ?? 0,
        transactionIndex: transaction.transactionIndex ?? 0,
        to: transaction.to ?? '',
        methodName: decodedTxInput?.methodName || null,
      };

      await this.dataDB.insertTransaction(transactionRow);
      this.logger.incrementIndexedCount('transaction');

      await this.dataDB.insertTransactionInput({ transactionHash, input: transaction.input });

      if (decodedTxInput?.parameters) {
        for (const parameter of decodedTxInput.parameters)
          await this.dataDB.insertTransactionParameter({ ...parameter, transactionHash });

        await this.indexWrappedTransactions(
          transaction.input,
          decodedTxInput.parameters,
          transactionRow.to,
          null,
          transactionHash,
        );
      }
    } catch (e) {
      this.fileLogger.error(`Error while indexing transaction: ${e.message}`, { transactionHash });
    }
  }

  /**
   * Recursively indexes wrapped transactions that are part of a larger transaction.
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
      // Unwrap the transaction, to see if there are any wrapped transactions inside
      const unwrappedTransactions = await this.decodingService.unwrapTransaction(
        input.slice(0, 10),
        decodedParams,
        contractAddress,
      );

      // If there are wrapped transactions, insert them into the database and index their wrapped transactions as well
      if (unwrappedTransactions) {
        for (const unwrappedTransaction of unwrappedTransactions) {
          const row = await this.dataDB.insertWrappedTx({
            from: contractAddress,
            to: unwrappedTransaction.to,
            value: unwrappedTransaction.value,
            parentId: parentId,
            parentTransactionHash: parentTxHash,
            methodId: unwrappedTransaction.input.slice(0, 10),
            methodName: unwrappedTransaction.methodName,
          });

          await this.dataDB.insertWrappedTxInput({
            wrappedTransactionId: row.id,
            input: unwrappedTransaction.input,
          });

          for (const parameter of unwrappedTransaction.parameters)
            await this.dataDB.insertWrappedTxParameter({
              ...parameter,
              wrappedTransactionId: row.id,
            });

          // Index the wrapped transaction's wrapped transactions as well
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

  async indexContract(address: string) {
    // Check if the contract have already been indexed (contract indexed only if interfaceCode is set)
    const contractAlreadyIndexed = await this.dataDB.getContractByAddress(address);
    if (contractAlreadyIndexed && contractAlreadyIndexed?.interfaceCode) return;

    this.fileLogger.info('Indexing contract', { address });

    const contractInterface = await this.web3Service.identifyContractInterface(address);
    await this.dataDB.insertContract({
      address,
      interfaceCode: contractInterface?.code ?? 'unknown',
      interfaceVersion: contractInterface?.version ?? null,
    });
    this.logger.incrementIndexedCount('contract');
  }
}
