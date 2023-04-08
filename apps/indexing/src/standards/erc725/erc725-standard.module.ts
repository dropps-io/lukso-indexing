import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { Erc725StandardService } from './erc725-standard.service';
import { DecodingModule } from '../../decoding/decoding.module';

@Module({
  imports: [LoggerModule, LuksoDataDbModule, DecodingModule],
  providers: [Erc725StandardService],
  exports: [Erc725StandardService],
})
export class Erc725StandardModule {}
