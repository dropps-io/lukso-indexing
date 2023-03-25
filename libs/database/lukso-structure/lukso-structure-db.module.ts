import { Module } from '@nestjs/common';

import { LuksoStructureDbService } from './lukso-structure-db.service';

@Module({
  imports: [],
  providers: [LuksoStructureDbService],
  exports: [LuksoStructureDbService],
})
export class LuksoStructureDbModule {}
