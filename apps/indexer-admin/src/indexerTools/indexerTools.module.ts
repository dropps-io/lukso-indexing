import { Module } from '@nestjs/common';

import { IndexerToolsController } from './indexerTools.controller';
import { IndexerToolsService } from './indexerTools.service';
import { RedisModule } from '../../../../shared/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [IndexerToolsController],
  providers: [IndexerToolsService],
})
export class IndexerToolsModule {}
