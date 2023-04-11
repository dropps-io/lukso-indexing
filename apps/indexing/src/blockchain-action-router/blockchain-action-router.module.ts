import { Module } from '@nestjs/common';

import { BlockchainActionRouterService } from './blockchain-action-router.service';
import { Lsp8standardModule } from '../standards/lsp8/lsp8standard.module';
import { Erc725StandardModule } from '../standards/erc725/erc725-standard.module';
@Module({
  imports: [Lsp8standardModule, Erc725StandardModule],
  providers: [BlockchainActionRouterService],
  exports: [BlockchainActionRouterService],
})
export class BlockchainActionRouterModule {}