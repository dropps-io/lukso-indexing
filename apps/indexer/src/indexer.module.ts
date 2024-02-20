import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { RedisModule } from '@shared/redis/redis.module';

import { IndexerService } from './indexer.service';
import { SchedulingModule } from './scheduling/scheduling.module';

@Module({
  imports: [SchedulingModule, LoggerModule, RedisModule],
  providers: [IndexerService],
})
export class IndexerModule {}
