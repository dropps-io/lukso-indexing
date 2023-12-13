import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { MetadataService } from './metadata.service';
import { EthersModule } from '../ethers/ethers.module';

@Module({
  imports: [LoggerModule, LuksoDataDbModule, EthersModule],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
