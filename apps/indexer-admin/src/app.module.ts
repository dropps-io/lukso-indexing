import { Module } from '@nestjs/common';

import { AbiModule } from './abi/abi.module';
import { ContractInterfacesModule } from './contractInterfaces/contractInterfaces.module';
import { ERC725ySchemasModule } from './ERC725ySchemas/ERC725ySchemas.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AbiModule, ContractInterfacesModule, ERC725ySchemasModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
