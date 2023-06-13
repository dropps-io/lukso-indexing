import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { ContractTokenResolver } from './contract-token.resolver';
import { ContractTokenService } from './contract-token.service';
import { ExtendedDataDbModule } from '../libs/extended-data-db/extended-data-db.module';

@Module({
  imports: [LoggerModule, ExtendedDataDbModule],
  providers: [ContractTokenResolver, ContractTokenService],
  exports: [ContractTokenResolver],
})
export class CollectionTokenModule {}
