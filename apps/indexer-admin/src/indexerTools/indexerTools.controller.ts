import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { AbiItem } from 'web3-utils';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { IndexerToolsService } from './indexerTools.service';

@ApiTags('IndexerTools')
@Controller('indexertools')
export class IndexerToolsController {
  constructor(private readonly indexerToolsService: IndexerToolsService) {}

  @Get('lastIndexedBlocks')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async lastIndexedBlocks() {
    await this.indexerToolsService.getLastIndexedBlocks();
  }

  @Get('status')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async status() {
    await this.indexerToolsService.getStatus();
  }

  @Get('chunksSizes')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async chunksSizes() {
    await this.indexerToolsService.getChunksSizes();
  }

  @Get('pLimit')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async pLimit() {
    await this.indexerToolsService.getPLimit();
  }

  @Post('changeLastIndexedBlocks')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changeLastIndexedBlocks(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setLastIndexedBlocks(newValue);
  }

  @Post('changeStatus')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changeStatus(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setStatus(newValue);
  }

  @Post('changeChunksSizes')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changeChunksSizes(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setChunkSizes(newValue);
  }

  @Post('changePLimit')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changePLimit(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setPLimit(newValue);
  }
}
