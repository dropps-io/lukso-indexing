import { Module } from '@nestjs/common';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LoggerModule } from '@libs/logger/logger.module';
import { RedisModule } from '@shared/redis/redis.module';

import { DecodingService } from './decoding.service';
import { EthersModule } from '../ethers/ethers.module';

@Module({
  imports: [LuksoStructureDbModule, EthersModule, LoggerModule, RedisModule],
  providers: [DecodingService],
  exports: [DecodingService],
})
export class DecodingModule {}
