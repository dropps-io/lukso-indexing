import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { BlockchainActionRouterService } from './blockchain-action-router.service';
import { Lsp7standardModule } from '../standards/lsp7/lsp7standard.module';
import { Lsp8standardModule } from '../standards/lsp8/lsp8standard.module';
import { Erc725StandardModule } from '../standards/erc725/erc725-standard.module';
@Module({
  imports: [Lsp7standardModule, Lsp8standardModule, Erc725StandardModule, LoggerModule],
  providers: [BlockchainActionRouterService],
  exports: [BlockchainActionRouterService],
})
export class BlockchainActionRouterModule {}
