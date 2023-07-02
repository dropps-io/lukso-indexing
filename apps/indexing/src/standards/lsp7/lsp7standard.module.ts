import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { Lsp7standardService } from './lsp7standard.service';
import { EthersModule } from '../../ethers/ethers.module';

@Module({
  imports: [LuksoDataDbModule, LoggerModule, EthersModule],
  providers: [Lsp7standardService],
  exports: [Lsp7standardService],
})
export class Lsp7standardModule {}
