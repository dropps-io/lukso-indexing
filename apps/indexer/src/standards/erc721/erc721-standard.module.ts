import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { MetadataModule } from '../../metadata/metadata.module';
import { Erc721StandardService } from './erc721-standard.service';

@Module({
  imports: [LuksoDataDbModule, LoggerModule, MetadataModule],
  providers: [Erc721StandardService],
  exports: [Erc721StandardService],
})
export class Erc721StandardModule {}
