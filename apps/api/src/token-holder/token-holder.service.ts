import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { ObjectType } from '@nestjs/graphql';

import { ExtendedDataDbService } from '../libs/extended-data-db/extended-data-db.service';
import { ADDRESS_PAGE_SIZE } from '../globals';
import { Pagination } from '../entities/pagination.entity';
import { TokenHolderEntity } from './entities/token-holder.entity';
import { FindTokenHolderArgs } from './dto/find-token-holder.args';

@ObjectType()
class TokenHolderPagination extends Pagination(TokenHolderEntity) {}

@Injectable()
export class TokenHolderService {
  private readonly logger: winston.Logger;

  constructor(
    private readonly dataDB: ExtendedDataDbService,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = loggerService.getChildLogger('AssetsService');
  }

  /**
   * Method to find the paginated list of addresses.
   *
   * @param {FindTokenHolderArgs} args - Arguments required to find addresses.
   * @returns {Promise<TokenHolderPagination>} - Paginated list of addresses.
   */
  async find(args: FindTokenHolderArgs): Promise<TokenHolderPagination> {
    const {
      holderAddress,
      contractAddress,
      tokenId,
      page,
      holderBeforeBlock,
      holderAfterBlock,
      minBalance,
      maxBalance,
    } = args;
    const response: TokenHolderPagination = {
      count: 0,
      page,
      pageLength: ADDRESS_PAGE_SIZE,
      totalPages: 0,
      results: [],
    };

    response.results = await this.dataDB.searchTokenHolder(
      ADDRESS_PAGE_SIZE,
      (page - 1) * ADDRESS_PAGE_SIZE,
      holderAddress,
      contractAddress,
      tokenId,
      minBalance,
      maxBalance,
      holderAfterBlock,
      holderBeforeBlock,
    );

    response.count = await this.dataDB.searchTokenHolderCount(
      holderAddress,
      contractAddress,
      tokenId,
      minBalance,
      maxBalance,
      holderAfterBlock,
      holderBeforeBlock,
    );

    response.totalPages = Math.ceil(response.count / ADDRESS_PAGE_SIZE);
    return response;
  }
}
