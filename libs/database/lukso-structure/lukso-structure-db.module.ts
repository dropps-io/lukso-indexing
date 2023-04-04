import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { LuksoStructureDbService } from './lukso-structure-db.service';

@Module({
  imports: [LoggerModule],
  providers: [LuksoStructureDbService],
  exports: [LuksoStructureDbService],
})
export class LuksoStructureDbModule {}
