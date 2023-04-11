import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { ExtendedDataDbService } from './extended-data-db.service';

@Module({
  imports: [LoggerModule],
  providers: [ExtendedDataDbService],
  exports: [ExtendedDataDbService],
})
export class ExtendedDataDbModule {}
