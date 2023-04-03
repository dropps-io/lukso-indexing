import { Module } from '@nestjs/common';

import { DecodingService } from './decoding.service';
import { LuksoStructureDbModule } from '../../../../libs/database/lukso-structure/lukso-structure-db.module';
import { LoggerModule } from '../../../../libs/logger/logger.module';
import { Web3Module } from '../web3/web3.module';

@Module({
  imports: [LuksoStructureDbModule, LoggerModule, Web3Module],
  providers: [DecodingService],
  exports: [DecodingService],
})
export class DecodingModule {}
