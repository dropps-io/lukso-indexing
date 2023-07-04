import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';

import { EthersService } from './ethers.service';

@Module({
  imports: [LoggerModule, LuksoStructureDbModule],
  providers: [EthersService],
  exports: [EthersService],
})
export class EthersModule {}
