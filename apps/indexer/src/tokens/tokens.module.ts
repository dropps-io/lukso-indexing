import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';
import { LuksoDataDbModule } from '@db/lukso-data/lukso-data-db.module';

import { TokensService } from './tokens.service';
import { EthersModule } from '../ethers/ethers.module';
import { MetadataModule } from '../metadata/metadata.module';

@Module({
  imports: [LoggerModule, LuksoDataDbModule, EthersModule, MetadataModule],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
