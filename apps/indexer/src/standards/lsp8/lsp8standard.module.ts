import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { Lsp8standardService } from './lsp8standard.service';

@Module({
  imports: [LuksoDataDbModule, LoggerModule],
  providers: [Lsp8standardService],
  exports: [Lsp8standardService],
})
export class Lsp8standardModule {}
