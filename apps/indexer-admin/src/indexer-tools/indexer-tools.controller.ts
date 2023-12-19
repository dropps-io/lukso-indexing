import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { IndexerToolsService } from './indexer-tools.service';

@ApiTags('IndexerTools')
@Controller('indexer-tools')
export class IndexerToolsController {
  constructor(private readonly indexerToolsService: IndexerToolsService) {}

  @Get('last-indexed-blocks')
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

  @Get('chunks-sizes')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async chunksSizes() {
    await this.indexerToolsService.getChunksSizes();
  }

  @Get('p-limit')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async pLimit() {
    await this.indexerToolsService.getPLimit();
  }

  @Post('change-last-indexed-blocks')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changeLastIndexedBlocks(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setLastIndexedBlocks(newValue);
  }

  @Post('change-status')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changeStatus(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setStatus(newValue);
  }

  @Post('change-chunks-sizes')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changeChunksSizes(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setChunkSizes(newValue);
  }

  @Post('change-p-limit')
  @ApiHeader({
    name: 'accessToken',
    description: 'Google Auth token',
    required: true,
  })
  async changePLimit(@Query('newValue') newValue: number) {
    await this.indexerToolsService.setPLimit(newValue);
  }
}
