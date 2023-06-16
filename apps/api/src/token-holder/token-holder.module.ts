import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { TokenHolderResolver } from './token-holder.resolver';
import { TokenHolderService } from './token-holder.service';
import { ExtendedDataDbModule } from '../libs/extended-data-db/extended-data-db.module';

@Module({
  imports: [LoggerModule, ExtendedDataDbModule],
  providers: [TokenHolderResolver, TokenHolderService],
  exports: [TokenHolderResolver],
})
export class TokenHolderModule {}
