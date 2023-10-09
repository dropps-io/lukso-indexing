import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AbiItem } from 'web3-utils';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AbiService } from './abi.service';

@ApiTags('ABIs')
@Controller('abi')
export class AbiController {
  constructor(private readonly abiService: AbiService) {}

  @Post()
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
  })
  async processAndUploadAbiItems(@Body() abiItems: Array<AbiItem>) {
    try {
      await this.abiService.processAndUploadAbiItems(abiItems);
    } catch {
      throw new HttpException('Failed to process ABI items', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
