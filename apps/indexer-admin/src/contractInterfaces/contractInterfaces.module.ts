import { Module } from '@nestjs/common';

import { ContractInterfacesController } from './contractInterfaces.controller';
import { ContractInterfacesService } from './contractInterfaces.service';

@Module({
  imports: [],
  controllers: [ContractInterfacesController],
  providers: [ContractInterfacesService],
})
export class ContractInterfacesModule {}
