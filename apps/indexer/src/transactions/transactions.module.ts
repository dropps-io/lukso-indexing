import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { RedisModule } from '@shared/redis/redis.module';

import { TransactionsService } from './transactions.service';
import { EthersModule } from '../ethers/ethers.module';
import { DecodingModule } from '../decoding/decoding.module';
import { Erc725StandardModule } from '../standards/erc725/erc725-standard.module';

@Module({
  imports: [
    LoggerModule,
    LuksoDataDbModule,
    EthersModule,
    DecodingModule,
    Erc725StandardModule,
    RedisModule,
  ],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
