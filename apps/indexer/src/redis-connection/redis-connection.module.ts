import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RedisConnectionService } from './redis-connection.service';

@Module({
  imports: [ConfigModule.forRoot(), LoggerModule],
  providers: [RedisConnectionService],
  exports: [RedisConnectionService],
})
export class RedisConnectionModule {}
