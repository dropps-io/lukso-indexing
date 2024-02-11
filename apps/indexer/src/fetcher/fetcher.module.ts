import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { FetcherService } from './fetcher.service';

@Module({
  imports: [LoggerModule],
  providers: [FetcherService],
  exports: [FetcherService],
})
export class FetcherModule {}
