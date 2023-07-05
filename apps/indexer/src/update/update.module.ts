import { Module } from '@nestjs/common';

import { UpdateService } from './update.service';

@Module({
  providers: [UpdateService],
  exports: [UpdateService],
})
export class UpdateModule {}
