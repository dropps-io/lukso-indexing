import { Injectable } from '@nestjs/common';
import { TransactionTable } from '@db/lukso-data/entities/tx.table';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { WrappedTxTable } from '@db/lukso-data/entities/wrapped-tx.table';
import { TX_METHOD_ID } from '@shared/types/enums';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { TransactionReceipt, TransactionResponse } from 'ethers';

import { DecodedParameter } from '../decoding/types/decoded-parameter';
import { decodedParamToMapping } from '../decoding/utils/decoded-param-to-mapping';
import { EthersService } from '../ethers/ethers.service';
import { DecodingService } from '../decoding/decoding.service';
import { Erc725StandardService } from '../standards/erc725/erc725-standard.service';
import { methodIdFromInput } from '../utils/method-id-from-input';
import { WrappedTransaction } from '../decoding/types/wrapped-tx';
import { REDIS_KEY } from '../../../../shared/redis/redis-keys';
import { RedisService } from '../../../../shared/redis/redis.service';

@Injectable()
export class TransactionsService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly ethersService: EthersService,
    protected readonly decodingService: DecodingService,
    protected readonly erc725Service: Erc725StandardService,
    // Redis service is only used for exception handling
    protected readonly redisService: RedisService,
  ) {
    this.logger = this.loggerService.getChildLogger('EventsService');
  }

  /**
   * Indexes a transaction to the LuksoData database.
   * This method handles transaction indexing by checking if the transaction has already been indexed,
   * retrieving transaction details, decoding transaction input, and updating the database accordingly.
   *
   * @param {string} transactionHash - The transaction hash to index.
   */
  @DebugLogger()
  @ExceptionHandler(false, true, null, REDIS_KEY.SKIP_TX_COUNT)
  public async indexTransaction(transactionHash: string) {
    if (await this.isTransactionIndexed(transactionHash)) return;

    const { transaction, transactionReceipt, decodedTxInput, timestamp } =
      await this.fetchTransactionData(transactionHash);
    const transactionRow = this.buildTransactionRow(
      transaction,
      transactionReceipt,
      decodedTxInput,
      timestamp,
    );

    await this.handleContracts(transaction.from, transaction.to);
    await this.insertTransactionDetails(transactionRow, transaction.data);

    if (decodedTxInput?.parameters) {
      await this.processDecodedParameters(
        decodedTxInput.parameters,
        transactionRow,
        transaction.data,
      );
    }
  }

  private async isTransactionIndexed(transactionHash: string): Promise<boolean> {
    return Boolean(await this.dataDB.getTransactionByHash(transactionHash));
  }

  private async fetchTransactionData(transactionHash: string): Promise<{
    transaction: TransactionResponse;
    transactionReceipt: TransactionReceipt;
    decodedTxInput: { parameters: DecodedParameter[]; methodName: string } | null;
    timestamp: number;
  }> {
    const transaction = await this.ethersService.getTransaction(transactionHash);
    const transactionReceipt = await this.ethersService.getTransactionReceipt(transactionHash);
    const decodedTxInput = await this.decodingService.decodeTransactionInput(transaction.data);
    const timestamp = await this.ethersService.getBlockTimestamp(transaction.blockNumber ?? 0);

    return { transaction, transactionReceipt, decodedTxInput, timestamp };
  }

  private buildTransactionRow(
    transaction: TransactionResponse,
    transactionReceipt: TransactionReceipt,
    decodedTxInput: { parameters: DecodedParameter[]; methodName: string } | null,
    timestamp: number,
  ): TransactionTable {
    const methodId = transaction.data.slice(0, 10);
    return {
      ...transaction,
      methodId,
      blockHash: transaction.blockHash ?? '',
      blockNumber: transaction.blockNumber ?? 0,
      date: new Date(timestamp),
      transactionIndex: transaction.index ?? 0,
      to: transaction.to ?? '',
      methodName: decodedTxInput?.methodName || null,
      gas: parseInt(transactionReceipt.gasUsed.toString()),
      value: transaction.value.toString(),
      gasPrice: transaction.gasPrice.toString(),
    };
  }

  private async handleContracts(from: string, to: string | null): Promise<void> {
    await this.dataDB.insertContract(
      { address: from, interfaceVersion: null, interfaceCode: null, type: null },
      'do nothing',
    );
    if (to) {
      await this.dataDB.insertContract(
        { address: to, interfaceVersion: null, interfaceCode: null, type: null },
        'do nothing',
      );
    }
  }

  private async insertTransactionDetails(txRow: TransactionTable, txInput: string) {
    await this.dataDB.insertTransaction(txRow);
    await this.dataDB.insertTransactionInput({ transactionHash: txRow.hash, input: txInput });
  }

  private async processDecodedParameters(
    decodedParameters: DecodedParameter[],
    transactionRow: TransactionTable,
    transactionInput: string,
  ) {
    await this.dataDB.insertTransactionParameters(
      transactionRow.hash,
      decodedParameters,
      'do nothing',
    );
    await this.routeTransaction(
      transactionRow.from,
      transactionRow.to,
      transactionRow.blockNumber,
      transactionRow.methodId,
      decodedParameters,
    );

    await this.indexWrappedTransactions(
      transactionInput,
      transactionRow.blockNumber,
      decodedParameters,
      transactionRow.to,
      null,
      transactionRow.hash,
    );
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
  @DebugLogger()
  @ExceptionHandler(false, true)
  protected async indexWrappedTransactions(
    input: string,
    blockNumber: number,
    decodedParams: DecodedParameter[],
    contractAddress: string,
    parentId: number | null,
    transactionHash: string,
  ) {
    const unwrappedTransactions = await this.getUnwrappedTransactions(
      input,
      decodedParams,
      contractAddress,
    );

    if (!unwrappedTransactions) return;

    for (const unwrappedTransaction of unwrappedTransactions) {
      const wrappedTxRow = this.buildWrappedTransactionRow(
        unwrappedTransaction,
        blockNumber,
        contractAddress,
        parentId,
        transactionHash,
      );
      await this.handleWrappedTransactionData(wrappedTxRow, unwrappedTransaction);
      await this.processNestedWrappedTransactions(
        unwrappedTransaction,
        wrappedTxRow,
        transactionHash,
      );
    }
  }

  private async getUnwrappedTransactions(
    input: string,
    decodedParams: DecodedParameter[],
    contractAddress: string,
  ) {
    return this.decodingService.unwrapTransaction(
      methodIdFromInput(input),
      decodedParams,
      contractAddress,
    );
  }

  private buildWrappedTransactionRow(
    unwrappedTransaction: WrappedTransaction,
    blockNumber: number,
    contractAddress: string,
    parentId: number | null,
    transactionHash: string,
  ): Omit<WrappedTxTable, 'id'> {
    return {
      blockNumber,
      from: contractAddress,
      to: unwrappedTransaction.to,
      value: unwrappedTransaction.value,
      parentId: parentId,
      transactionHash,
      methodId: unwrappedTransaction.input.slice(0, 10),
      methodName: unwrappedTransaction.methodName,
    };
  }

  private async handleWrappedTransactionData(
    wrappedTxRow: Omit<WrappedTxTable, 'id'>,
    unwrappedTransaction: WrappedTransaction,
  ) {
    const { id } = await this.dataDB.insertWrappedTx(wrappedTxRow);

    await this.insertWrappedContract(unwrappedTransaction);

    await this.dataDB.insertWrappedTxInput({
      wrappedTransactionId: id,
      input: unwrappedTransaction.input,
    });

    await this.dataDB.insertWrappedTxParameters(id, unwrappedTransaction.parameters, 'do nothing');

    await this.routeTransaction(
      wrappedTxRow.from,
      wrappedTxRow.to,
      wrappedTxRow.blockNumber,
      wrappedTxRow.methodId,
      unwrappedTransaction.parameters,
    );
  }

  private async insertWrappedContract(unwrappedTransaction: WrappedTransaction) {
    await this.dataDB.insertContract(
      {
        address: unwrappedTransaction.to,
        interfaceVersion: null,
        interfaceCode: null,
        type: null,
      },
      'do nothing',
    );
  }

  private async processNestedWrappedTransactions(
    unwrappedTransaction: WrappedTransaction,
    wrappedTxRow: Omit<WrappedTxTable, 'id'>,
    transactionHash: string,
  ) {
    await this.indexWrappedTransactions(
      unwrappedTransaction.input,
      wrappedTxRow.blockNumber,
      unwrappedTransaction.parameters,
      unwrappedTransaction.to,
      wrappedTxRow.parentId,
      transactionHash,
    );
  }

  @ExceptionHandler(false, true)
  async routeTransaction(
    from: string,
    to: string,
    blockNumber: number,
    methodId: string,
    decodedParameters: DecodedParameter[],
  ): Promise<void> {
    const paramsMap = decodedParamToMapping(decodedParameters);
    switch (methodId) {
      case TX_METHOD_ID.SET_DATA:
        await this.erc725Service.processSetDataTx(to, blockNumber, paramsMap);
        break;
      case TX_METHOD_ID.SET_DATA_BATCH:
        await this.erc725Service.processSetDataBatchTx(to, blockNumber, paramsMap);
        break;
    }
  }
}
