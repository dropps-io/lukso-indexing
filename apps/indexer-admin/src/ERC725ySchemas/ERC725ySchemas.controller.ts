import { Body, Controller, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import {ApiQuery, ApiTags} from '@nestjs/swagger';
import { ERC725YSchemaTable } from '@db/lukso-structure/entities/erc725YSchema.table';

import { ERC725ySchemasService } from './ERC725ySchemas.service';

@ApiTags('erc725ySchemas')
@Controller('erc725ySchemas')
export class ERC725ySchemasController {
  constructor(private readonly erc725ySchemasService: ERC725ySchemasService) {}

  @Post()
  @ApiQuery({ name: 'accessToken', required: true })
  async uploadERC725ySchemas(
    @Body() erc725ySchemas: Array<ERC725YSchemaTable>, // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('accessToken') accessToken,
  ) {
    try {
      await this.erc725ySchemasService.uploadERC725ySchemas(erc725ySchemas);
    } catch {
      throw new HttpException('Failed to process ERC725ySchemas', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
