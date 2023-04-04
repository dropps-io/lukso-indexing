import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { LuksoDataDbService } from './lukso-data-db.service';

@Module({
  imports: [LoggerModule],
  providers: [LuksoDataDbService],
  exports: [LuksoDataDbService],
})
export class LuksoDataDbModule {}
