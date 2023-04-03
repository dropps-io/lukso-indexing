import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { Web3Module } from './web3/web3.module';
import { DecodingModule } from './decoding/decoding.module';
import { LuksoDataDbModule } from '../../../libs/database/lukso-data/lukso-data-db.module';
import { UpdateModule } from './update/update.module';
import { LuksoStructureDbModule } from '../../../libs/database/lukso-structure/lukso-structure-db.module';
import { IndexingService } from './indexing.service';
import { LoggerModule } from '../../../libs/logger/logger.module';

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
