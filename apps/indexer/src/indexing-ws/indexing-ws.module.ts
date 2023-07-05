import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { IndexingWsGateway } from './indexing-ws.gateway';

@Module({
  imports: [LoggerModule],
  providers: [IndexingWsGateway],
  exports: [IndexingWsGateway],
})
export class IndexingWsModule {}
