import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { ObjectType } from '@nestjs/graphql';

import { ExtendedDataDbService } from '../libs/extended-data-db/extended-data-db.service';
import { ADDRESS_PAGE_SIZE } from '../globals';
import { Pagination } from '../entities/pagination.entity';
import { CollectionTokenEntity } from './entities/collection-token.entity';
import { FindCollectionTokenArgs } from './dto/find-collection-token.args';

@ObjectType()
class AssetsPagination extends Pagination(CollectionTokenEntity) {}

@Injectable()
export class ContractTokenService {
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
   * @param {FindAddressArgs} args - Arguments required to find addresses.
   * @returns {Promise<AddressPagination>} - Paginated list of addresses.
   */
  async find(args: FindCollectionTokenArgs): Promise<AssetsPagination> {
    const {
      addressInput,
      input,
      interfaceVersion,
      collectionName,
      collectionSymbol,
      interfaceCode,
      owner,
      page,
    } = args;
    let response: AssetsPagination = {
      count: 0,
      page,
      pageLength: ADDRESS_PAGE_SIZE,
      totalPages: 0,
      results: [],
    };

    const tokens = await this.dataDB.searchTokenWithMetadata(
      ADDRESS_PAGE_SIZE,
      (page - 1) * ADDRESS_PAGE_SIZE,
      addressInput,
      collectionName,
      collectionSymbol,
      input,
      interfaceVersion,
      interfaceCode,
      owner,
    );

    response = {
      ...response,
      results: tokens.map((token) => {
        return { ...token, balance: 0, isNFT: true };
      }),
    };

    response.totalPages = Math.ceil(response.count / ADDRESS_PAGE_SIZE);
    return response;
  }
}
