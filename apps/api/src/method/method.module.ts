import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';

import { MethodResolver } from './method.resolver';
import { MethodService } from './method.service';

@Module({
  imports: [LoggerModule, LuksoStructureDbModule],
  providers: [MethodResolver, MethodService],
  exports: [MethodResolver],
})
export class MethodModule {}
