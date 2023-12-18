import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { ContractsService } from './contracts.service';
import { EthersModule } from '../ethers/ethers.module';
import { MetadataModule } from '../metadata/metadata.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [LoggerModule, LuksoDataDbModule, EthersModule, MetadataModule, RedisModule],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
