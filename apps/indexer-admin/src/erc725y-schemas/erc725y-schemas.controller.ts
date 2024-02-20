import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ERC725YSchemaTable } from '@db/lukso-structure/entities/erc725YSchema.table';

import { Erc725ySchemasService } from './erc725y-schemas.service';

@ApiTags('erc725y-schemas')
@Controller('erc725y-schemas')
export class Erc725ySchemasController {
  constructor(private readonly erc725ySchemasService: Erc725ySchemasService) {}

  @Post()
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async uploadERC725ySchemas(@Body() erc725ySchemas: Array<ERC725YSchemaTable>) {
    try {
      await this.erc725ySchemasService.uploadERC725ySchemas(erc725ySchemas);
    } catch {
      throw new HttpException('Failed to process ERC725ySchemas', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
