import { Module } from '@nestjs/common';

import { IndexerToolsController } from './indexer-tools.controller';
import { IndexerToolsService } from './indexer-tools.service';
import { RedisModule } from '../../../../shared/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [IndexerToolsController],
  providers: [IndexerToolsService],
})
export class IndexerToolsModule {}
