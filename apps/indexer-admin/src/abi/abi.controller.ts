import { Body, Controller, HttpException, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { AbiItem } from 'web3-utils';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AbiService } from './abi.service';

@ApiTags('ABIs')
@Controller('abi')
export class AbiController {
  constructor(private readonly abiService: AbiService) {}

  @Post()
  @ApiQuery({ name: 'accessToken', required: true })
  async processAndUploadAbiItems(
    @Body() abiItems: Array<AbiItem>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('accessToken') accessToken: string,
  ) {
    try {
      await this.abiService.processAndUploadAbiItems(abiItems);
    } catch {
      throw new HttpException('Failed to process ABI items', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
