import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';

import { ContractInterfacesService } from './contractInterfaces.service';

@ApiTags('contractInterfaces')
@Controller('contractInterfaces')
export class ContractInterfacesController {
  constructor(private readonly contractInterfaceService: ContractInterfacesService) {}

  @Post()
  async uploadContractInterfaces(@Body() contractInterfaces: Array<ContractInterfaceTable>) {
    try {
      await this.contractInterfaceService.uploadContractInterfaces(contractInterfaces);
    } catch {
      throw new HttpException('Failed to process ABI items', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
