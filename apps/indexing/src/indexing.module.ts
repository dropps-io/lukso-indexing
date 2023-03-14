import { Module } from '@nestjs/common';
import { IndexingService } from './indexing.service';

@Module({
  imports: [],
  providers: [IndexingService],
})
export class IndexingModule {}
