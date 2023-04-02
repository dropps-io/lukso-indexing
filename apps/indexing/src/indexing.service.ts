import { Injectable, OnModuleInit } from '@nestjs/common';
import winston from 'winston';

import { NODE_ENV } from './globals';
import { LuksoStructureDbService } from '../../../libs/database/lukso-structure/lukso-structure-db.service';
import { FetchingService } from './fetching/fetching.service';
import { LuksoDataDbService } from '../../../libs/database/lukso-data/lukso-data-db.service';
import { TransactionTable } from '../../../libs/database/lukso-data/entities/tx.table';
import { DecodingService } from './decoding/decoding.service';
import { LoggerService } from '../../../libs/logger/logger.service';

@Injectable()
export class IndexingService implements OnModuleInit {
  private readonly fileLogger: winston.Logger;

  constructor(
    private readonly structureDB: LuksoStructureDbService,
    private readonly dataDB: LuksoDataDbService,
    private readonly fetchingService: FetchingService,
    private readonly decodingService: DecodingService,
    private readonly logger: LoggerService,
  ) {
    this.fileLogger = logger.getChildLogger('indexing');
  }
  onModuleInit() {
    if (NODE_ENV !== 'test') {
      this.indexByBlock().then();
    }
  }

  protected async indexByBlock() {
    const startTime = new Date();

    const config = await this.structureDB.getConfig();
    const lastBlock = await this.fetchingService.getLastBlock();

    this.logger.setLastBlock(lastBlock);
    this.logger.setLatestIndexedBlock(config.latestIndexedBlock);

    const blockToIndex =
      config.latestIndexedBlock + 1 > lastBlock ? lastBlock : config.latestIndexedBlock + 1;

    this.fileLogger.info(`Indexing data from block ${blockToIndex}`, { block: blockToIndex });

    const transactionsHashes = await this.fetchingService.getBlockTransactions(blockToIndex);

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

  protected async indexTransaction(transactionHash: string) {
    const transactionAlreadyIndexed = await this.dataDB.getTransactionByHash(transactionHash);
    if (transactionAlreadyIndexed) return;

    this.fileLogger.info('Indexing transaction', { transactionHash });

    const transaction = await this.fetchingService.getTransaction(transactionHash);

    const methodId = transaction.input.slice(0, 10);

    const decodedTxInput = await this.decodingService.identifyAndDecodeTransactionInput(
      transaction.input,
    );

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
    this.logger.incrementIndexedTransactions();

    await this.dataDB.insertTransactionInput({ transactionHash, input: transaction.input });

    if (decodedTxInput?.parameters)
      for (const parameter of decodedTxInput.parameters)
        await this.dataDB.insertTransactionParameter({ ...parameter, transactionHash });
  }
}
