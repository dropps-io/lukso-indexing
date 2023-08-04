import { Module } from '@nestjs/common';
import { LoggerModule } from '@libs/logger/logger.module';

import { IpfsService } from './ipfs.service';

@Module({
  imports: [LoggerModule],
  providers: [IpfsService],
  exports: [IpfsService],
})
export class IpfsModule {}
