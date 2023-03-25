import { Module } from '@nestjs/common';

import { FetchingService } from './fetching.service';

@Module({
  providers: [FetchingService],
  exports: [FetchingService],
})
export class FetchingModule {}
