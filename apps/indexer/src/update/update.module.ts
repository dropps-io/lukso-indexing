import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { RedisModule } from '../redis/redis.module';
import { UpdateService } from './update.service';
import { DecodingModule } from '../decoding/decoding.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    LoggerModule,
    RedisModule,
    LuksoStructureDbModule,
    LuksoDataDbModule,
    DecodingModule,
    ContractsModule,
  ],
  providers: [UpdateService],
  exports: [UpdateService],
})
export class UpdateModule {}
