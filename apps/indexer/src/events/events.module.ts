import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { RedisModule } from '@shared/redis/redis.module';

import { EventsService } from './events.service';
import { Lsp8standardModule } from '../standards/lsp8/lsp8standard.module';
import { Lsp7standardModule } from '../standards/lsp7/lsp7standard.module';
import { DecodingModule } from '../decoding/decoding.module';
import { IndexingWsModule } from '../indexing-ws/indexing-ws.module';
import { EthersModule } from '../ethers/ethers.module';
import { Erc725StandardModule } from '../standards/erc725/erc725-standard.module';
import { Erc20standardModule } from '../standards/erc20/erc20standard.module';

@Module({
  imports: [
    LoggerModule,
    Lsp8standardModule,
    Lsp7standardModule,
    Erc725StandardModule,
    Erc20standardModule,
    DecodingModule,
    LuksoDataDbModule,
    LuksoStructureDbModule,
    IndexingWsModule,
    EthersModule,
    RedisModule,
  ],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
