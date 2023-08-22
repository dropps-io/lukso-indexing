import dotenv from 'dotenv';
dotenv.config();
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LoggerModule } from '@libs/logger/logger.module';

import { EthersModule } from './ethers/ethers.module';
import { DecodingModule } from './decoding/decoding.module';
import { UpdateModule } from './update/update.module';
import { IndexerService } from './indexer.service';
import { BlockchainActionRouterModule } from './blockchain-action-router/blockchain-action-router.module';
import { IndexingWsGateway } from './indexing-ws/indexing-ws.gateway';
import { IndexingWsModule } from './indexing-ws/indexing-ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EthersModule,
    DecodingModule,
    LuksoDataDbModule,
    LuksoStructureDbModule,
    LoggerModule,
    UpdateModule,
    BlockchainActionRouterModule,
    IndexingWsModule,
  ],
  providers: [IndexerService, IndexingWsGateway],
})
export class IndexerModule {}
