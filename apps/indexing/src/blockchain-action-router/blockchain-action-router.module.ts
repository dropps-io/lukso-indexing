import { Module } from '@nestjs/common';

import { BlockchainActionRouterService } from './blockchain-action-router.service';
import { Lsp8standardModule } from '../standards/lsp8/lsp8standard.module';
@Module({
  imports: [Lsp8standardModule],
  providers: [BlockchainActionRouterService],
  exports: [BlockchainActionRouterService],
})
export class BlockchainActionRouterModule {}
