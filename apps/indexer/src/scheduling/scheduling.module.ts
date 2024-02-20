import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { RedisModule } from '@shared/redis/redis.module';

import { SchedulingService } from './scheduling.service';
import { EthersModule } from '../ethers/ethers.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ContractsModule } from '../contracts/contracts.module';
import { EventsModule } from '../events/events.module';
import { TokensModule } from '../tokens/tokens.module';
import { UpdateModule } from '../update/update.module';
import { MetadataModule } from '../metadata/metadata.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoggerModule,
    EthersModule,
    LuksoDataDbModule,
    TransactionsModule,
    ContractsModule,
    EventsModule,
    TokensModule,
    RedisModule,
    UpdateModule,
    MetadataModule,
  ],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
