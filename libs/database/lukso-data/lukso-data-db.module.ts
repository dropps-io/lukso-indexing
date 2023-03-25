import { Module } from '@nestjs/common';

import { LuksoDataDbService } from './lukso-data-db.service';

@Module({
  imports: [],
  providers: [LuksoDataDbService],
  exports: [LuksoDataDbService],
})
export class LuksoDataDbModule {}
