import { Module } from '@nestjs/common';
import { AbiController } from './abi.controller';
import { AbiService } from './abi.service';

@Module({
  imports: [],
  controllers: [AbiController],
  providers: [AbiService],
})
export class AbiModule {}
