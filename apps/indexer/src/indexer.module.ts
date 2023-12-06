import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { ConfigModule } from '@nestjs/config';

import { IndexerService } from './indexer.service';
import { IndexingWsGateway } from './indexing-ws/indexing-ws.gateway';
import { SchedulingModule } from './scheduling/scheduling.module';
import { IndexingWsModule } from './indexing-ws/indexing-ws.module';
import { RedisModule } from './redis/redis.module';

const ENV = process.env.ENV;
@Module({
  imports: [
    SchedulingModule,
    IndexingWsModule,
    LoggerModule,
    RedisModule,
    ConfigModule.forRoot({
      envFilePath: ENV && ENV !== 'prod' && ENV !== 'local' ? `.env.${ENV}` : '.env',
    }),
  ],
  providers: [IndexerService, IndexingWsGateway],
})
export class IndexerModule {}
