import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';

import { ExtendedDataDbService } from '../libs/extended-data-db/extended-data-db.service';
import { WrappedTxEntity } from './entities/wrapped-tx.entity';
import { WrappedTxParameterEntity } from './entities/wrapped-tx-parameter.entity';

@Injectable()
export class WrappedTxService {
  private readonly fileLogger: winston.Logger;

  constructor(
    private readonly dataDB: ExtendedDataDbService,
    private readonly logger: LoggerService,
  ) {
    this.fileLogger = logger.getChildLogger('WrappedTx');
  }

  async findByTransactionHash(
    transactionHash: string,
    methodId?: string,
  ): Promise<WrappedTxEntity[]> {
    return await this.dataDB.getWrappedTxFromTransactionHash(transactionHash, methodId);
  }

  async findParametersById(wrappedTxId: number): Promise<WrappedTxParameterEntity[]> {
    return await this.dataDB.getWrappedTxParameters(wrappedTxId);
  }
}
