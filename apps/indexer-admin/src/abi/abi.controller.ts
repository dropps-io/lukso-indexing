import {Body, Controller, HttpException, HttpStatus, Post} from '@nestjs/common';
import { AbiService } from './abi.service';
import { AbiItem } from 'web3-utils';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('ABIs')
@Controller('abi')
export class AbiController {
  constructor(private readonly abiService: AbiService) {}

  @Post()
  async processAndUploadAbiItems(@Body() abiItems: Array<Array<AbiItem>>) {
    try {
      await this.abiService.processAndUploadAbiItems(abiItems);
    } catch {
      throw new HttpException(
        'Failed to process ABI items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
