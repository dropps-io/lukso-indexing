import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LoggerModule } from '@libs/logger/logger.module';

import { Web3Module } from './web3/web3.module';
import { DecodingModule } from './decoding/decoding.module';
import { UpdateModule } from './update/update.module';
import { IndexingService } from './indexing.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    Web3Module,
    DecodingModule,
    LuksoDataDbModule,
    LuksoStructureDbModule,
    LoggerModule,
    UpdateModule,
  ],
  providers: [IndexingService],
})
export class IndexingModule {}
