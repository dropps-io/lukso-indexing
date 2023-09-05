import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';

import { EthersService } from './ethers.service';
import { FetcherModule } from '../fetcher/fetcher.module';

@Module({
  imports: [LoggerModule, LuksoStructureDbModule, FetcherModule],
  providers: [EthersService],
  exports: [EthersService],
})
export class EthersModule {}
