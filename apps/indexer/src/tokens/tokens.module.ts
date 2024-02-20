import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { RedisModule } from '@shared/redis/redis.module';

import { TokensService } from './tokens.service';
import { EthersModule } from '../ethers/ethers.module';

@Module({
  imports: [LoggerModule, LuksoDataDbModule, EthersModule, RedisModule],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
