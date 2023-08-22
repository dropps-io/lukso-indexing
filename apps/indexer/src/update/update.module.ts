import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@libs/logger/logger.module';

import { UpdateService } from './update.service';
import { RedisModule } from '../redis/redis.module';
import { DecodingModule } from '../decoding/decoding.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LuksoStructureDbModule,
    LuksoDataDbModule,
    ConfigModule.forRoot(),
    LoggerModule,
    RedisModule,
    DecodingModule,
  ],
  providers: [UpdateService, ConfigService],
  exports: [UpdateService],
})
export class UpdateModule {}
