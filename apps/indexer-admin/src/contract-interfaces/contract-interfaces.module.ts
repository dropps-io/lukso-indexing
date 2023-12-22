import { Module } from '@nestjs/common';

import { ContractInterfacesController } from './contract-interfaces.controller';
import { ContractInterfacesService } from './contract-interfaces.service';

@Module({
  imports: [],
  controllers: [ContractInterfacesController],
  providers: [ContractInterfacesService],
})
export class ContractInterfacesModule {}
