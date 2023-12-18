import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { TransactionsService } from './transactions.service';
import { EthersModule } from '../ethers/ethers.module';
import { DecodingModule } from '../decoding/decoding.module';
import { Erc725StandardModule } from '../standards/erc725/erc725-standard.module';
import { RedisModule } from '../redis/redis.module';

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
