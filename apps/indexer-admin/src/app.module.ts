import { Module } from '@nestjs/common';

import { AbiModule } from './abi/abi.module';
import { ContractInterfacesModule } from './contractInterfaces/contractInterfaces.module';
import { ERC725ySchemasModule } from './ERC725ySchemas/ERC725ySchemas.module';

@Module({
  imports: [AbiModule, ContractInterfacesModule, ERC725ySchemasModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
