import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { IndexerService } from './indexer.service';
import { IndexingWsGateway } from './indexing-ws/indexing-ws.gateway';
import { SchedulingModule } from './scheduling/scheduling.module';
import { IndexingWsModule } from './indexing-ws/indexing-ws.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [SchedulingModule, IndexingWsModule, LoggerModule, RedisModule],
  providers: [IndexerService, IndexingWsGateway],
})
export class IndexerModule {}
