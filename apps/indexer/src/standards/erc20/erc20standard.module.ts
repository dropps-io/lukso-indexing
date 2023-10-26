import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { EthersModule } from '../../ethers/ethers.module';
import { Erc20standardService } from './erc20standard.service';

@Module({
  imports: [LuksoDataDbModule, LoggerModule, EthersModule],
  providers: [Erc20standardService],
  exports: [Erc20standardService],
})
export class Erc20standardModule {}
