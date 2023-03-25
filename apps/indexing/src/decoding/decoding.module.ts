import { Module } from '@nestjs/common';

import { DecodingService } from './decoding.service';

@Module({
  providers: [DecodingService],
  exports: [DecodingService],
})
export class DecodingModule {}
