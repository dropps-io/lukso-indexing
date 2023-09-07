import { Injectable } from '@nestjs/common';
import { TransactionTable } from '@db/lukso-data/entities/tx.table';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { WrappedTxTable } from '@db/lukso-data/entities/wrapped-tx.table';
import { TX_METHOD_ID } from '@models/enums';

import { DecodedParameter } from '../decoding/types/decoded-parameter';
import { convertDecodedParamToMapping } from '../decoding/utils/convert-decoded-param-to-mapping';
import { EthersService } from '../ethers/ethers.service';
import { DecodingService } from '../decoding/decoding.service';
import { Erc725StandardService } from '../standards/erc725/erc725-standard.service';

@Injectable()
export class TransactionsService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly ethersService: EthersService,
    protected readonly decodingService: DecodingService,
    protected readonly erc725Service: Erc725StandardService,
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
  public async indexTransaction(transactionHash: string) {
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

        await this.routeTransaction(
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

          await this.routeTransaction(
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

  async routeTransaction(
    from: string,
    to: string,
    blockNumber: number,
    methodId: string,
    decodedParameters: DecodedParameter[],
  ): Promise<void> {
    const paramsMap = convertDecodedParamToMapping(decodedParameters);
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
