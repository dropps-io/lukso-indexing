import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';

import { IpfsModule } from '../ipfs/ipfs.module';
import { EthersService } from './ethers.service';
import { IpfsService } from '../ipfs/ipfs.service';

@Module({
  imports: [LoggerModule, LuksoStructureDbModule, IpfsModule],
  providers: [EthersService, IpfsService],
  exports: [EthersService],
})
export class EthersModule {}
