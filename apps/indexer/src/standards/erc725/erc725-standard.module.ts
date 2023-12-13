import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { Erc725StandardService } from './erc725-standard.service';
import { DecodingModule } from '../../decoding/decoding.module';
import { MetadataModule } from '../../metadata/metadata.module';
import { Lsp8standardModule } from '../lsp8/lsp8standard.module';

@Module({
  imports: [LoggerModule, LuksoDataDbModule, DecodingModule, MetadataModule, Lsp8standardModule],
  providers: [Erc725StandardService],
  exports: [Erc725StandardService],
})
export class Erc725StandardModule {}
