import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FetchingModule } from './fetching/fetching.module';
import { DecodingModule } from './decoding/decoding.module';
import { LuksoDataDbModule } from '../../../libs/database/lukso-data/lukso-data-db.module';
import { UpdateModule } from './update/update.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FetchingModule,
    DecodingModule,
    LuksoDataDbModule,
    UpdateModule,
  ],
})
export class IndexingModule {}
