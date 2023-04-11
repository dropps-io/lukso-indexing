import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { AddressResolver } from './address.resolver';
import { AddressService } from './address.service';
import { ExtendedDataDbModule } from '../libs/extended-data-db/extended-data-db.module';

@Module({
  imports: [LoggerModule, ExtendedDataDbModule],
  providers: [AddressResolver, AddressService],
  exports: [AddressResolver],
})
export class AddressModule {}
