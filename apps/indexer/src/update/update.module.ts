import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@libs/logger/logger.module';

import { UpdateService } from './update.service';
import { RedisConnectionModule } from '../redis-connection/redis-connection.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LuksoStructureDbModule,
    LuksoDataDbModule,
    ConfigModule.forRoot(),
    LoggerModule,
    RedisConnectionModule,
  ],
  providers: [UpdateService, ConfigService],
  exports: [UpdateService],
})
export class UpdateModule {}
