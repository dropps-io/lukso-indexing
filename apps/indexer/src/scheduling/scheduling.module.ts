import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { SchedulingService } from './scheduling.service';
import { EthersModule } from '../ethers/ethers.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ContractsModule } from '../contracts/contracts.module';
import { EventsModule } from '../events/events.module';
import { MetadataModule } from '../metadata/metadata.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoggerModule,
    EthersModule,
    LuksoStructureDbModule,
    LuksoDataDbModule,
    TransactionsModule,
    ContractsModule,
    EventsModule,
    MetadataModule,
    TokensModule,
  ],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
