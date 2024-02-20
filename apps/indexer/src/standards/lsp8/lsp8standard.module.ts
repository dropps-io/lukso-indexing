import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { RedisService } from '@shared/redis/redis.service';

import { Lsp8standardService } from './lsp8standard.service';

@Module({
  imports: [LuksoDataDbModule, LoggerModule],
  providers: [Lsp8standardService, RedisService],
  exports: [Lsp8standardService],
})
export class Lsp8standardModule {}
