import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';

import { Web3Service } from './web3.service';

@Module({
  imports: [LoggerModule, LuksoStructureDbModule],
  providers: [Web3Service],
  exports: [Web3Service],
})
export class Web3Module {}
