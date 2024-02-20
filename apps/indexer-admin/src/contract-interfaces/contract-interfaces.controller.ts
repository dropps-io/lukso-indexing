import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';

import { ContractInterfacesService } from './contract-interfaces.service';

@ApiTags('contract-interfaces')
@Controller('contract-interfaces')
export class ContractInterfacesController {
  constructor(private readonly contractInterfaceService: ContractInterfacesService) {}

  @Post()
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async uploadContractInterfaces(
    @Body() contractInterfaces: Array<ContractInterfaceTable>, // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ) {
    try {
      await this.contractInterfaceService.uploadContractInterfaces(contractInterfaces);
    } catch {
      throw new HttpException('Failed to process ABI items', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
