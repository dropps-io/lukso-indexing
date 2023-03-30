import { Injectable, OnModuleInit } from '@nestjs/common';

import { NODE_ENV } from './globals';
import { LuksoStructureDbService } from '../../../libs/database/lukso-structure/lukso-structure-db.service';
import { FetchingService } from './fetching/fetching.service';
import { LuksoDataDbService } from '../../../libs/database/lukso-data/lukso-data-db.service';
import { TransactionTable } from '../../../libs/database/lukso-data/entities/tx.table';

@Injectable()
export class IndexingService implements OnModuleInit {
  constructor(
    private readonly structureDB: LuksoStructureDbService,
    private readonly dataDB: LuksoDataDbService,
    private readonly fetchingService: FetchingService,
  ) {}
  onModuleInit() {
    if (NODE_ENV != 'test') {
      this.indexByBlock().then();
    }
  }

  protected async indexByBlock() {
    const startTime = new Date();

    const config = await this.structureDB.getConfig();

    await this.fetchingService.getBlockTransactions(config.latestIndexedBlock);

    // Recursively call this function after a timeout
    setTimeout(
      this.indexByBlock.bind(this),
      Math.max(
        0,
        config.sleepBetweenIteration - Number(new Date().getTime() - startTime.getTime()),
      ),
    );
  }

  protected async indexTransaction(transactionHash: string) {
    const transactionAlreadyIndexed = await this.dataDB.getTransactionByHash(transactionHash);
    if (transactionAlreadyIndexed) return;

    const transaction = await this.fetchingService.getTransaction(transactionHash);
    const methodId = transaction.input.slice(0, 10);

    const transactionRow: TransactionTable = {
      ...transaction,
      methodId,
      blockHash: transaction.blockHash ?? '',
      blockNumber: transaction.blockNumber ?? 0,
      transactionIndex: transaction.transactionIndex ?? 0,
      to: transaction.to ?? '',
    };

    await this.dataDB.insertTransaction(transactionRow);
    await this.dataDB.insertTransactionInput({ transactionHash, input: transaction.input });

    // First decode parameters
    // Second decode wrapped parameters (if exists)
  }
}
