import { Module } from '@nestjs/common';

import { AbiModule } from './abi/abi.module';

@Module({
  imports: [AbiModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
