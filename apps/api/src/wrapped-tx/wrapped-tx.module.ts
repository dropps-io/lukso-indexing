import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { WrappedTxResolver } from './wrapped-tx.resolver';
import { WrappedTxService } from './wrapped-tx.service';
import { ExtendedDataDbModule } from '../libs/extended-data-db/extended-data-db.module';

@Module({
  imports: [LoggerModule, ExtendedDataDbModule],
  providers: [WrappedTxResolver, WrappedTxService],
  exports: [WrappedTxResolver],
})
export class WrappedTxModule {}
