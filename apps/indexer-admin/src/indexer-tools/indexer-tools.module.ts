import { Module } from '@nestjs/common';
import { RedisModule } from '@shared/redis/redis.module';

import { IndexerToolsController } from './indexer-tools.controller';
import { IndexerToolsService } from './indexer-tools.service';

@Module({
  imports: [RedisModule],
  controllers: [IndexerToolsController],
  providers: [IndexerToolsService],
})
export class IndexerToolsModule {}
