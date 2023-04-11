import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';
import { LuksoStructureDbModule } from '@db/lukso-structure/lukso-structure-db.module';
import { LoggerModule } from '@libs/logger/logger.module';

import { ApiService } from './api.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LuksoDataDbModule,
    LuksoStructureDbModule,
    LoggerModule,
  ],
  providers: [ApiService],
})
export class ApiModule {}
