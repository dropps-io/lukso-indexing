import { Module } from '@nestjs/common';

import { AbiModule } from './abi/abi.module';
import { ContractInterfacesModule } from './contractInterfaces/contractInterfaces.module';

@Module({
  imports: [AbiModule, ContractInterfacesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
