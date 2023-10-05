import { Body, Controller, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import {ApiQuery, ApiTags} from '@nestjs/swagger';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';

import { ContractInterfacesService } from './contractInterfaces.service';

@ApiTags('contractInterfaces')
@Controller('contractInterfaces')
export class ContractInterfacesController {
  constructor(private readonly contractInterfaceService: ContractInterfacesService) {}

  @Post()
  @ApiQuery({ name: 'accessToken', required: true })
  async uploadContractInterfaces(
    @Body() contractInterfaces: Array<ContractInterfaceTable>, // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('accessToken') accessToken,
  ) {
    try {
      await this.contractInterfaceService.uploadContractInterfaces(contractInterfaces);
    } catch {
      throw new HttpException('Failed to process ABI items', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
