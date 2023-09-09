import { Injectable } from '@nestjs/common';
import { ContractTokenTable } from '@db/lukso-data/entities/contract-token.table';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { DebugLogger } from '@decorators/debug-logging.decorator';

import { EthersService } from '../ethers/ethers.service';
import { MetadataService } from '../metadata/metadata.service';

@Injectable()
export class TokensService {
  protected logger: winston.Logger;

  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly ethersService: EthersService,
    protected readonly metadataService: MetadataService,
  ) {
    this.logger = this.loggerService.getChildLogger('TokensService');
  }

  @DebugLogger()
  public async indexToken(token: ContractTokenTable) {
    // Fetch the metadata of the contract token
    const decodedTokenId = await this.metadataService.indexContractTokenMetadata(
      token.address,
      token.tokenId,
    );

    // If metadata is available, insert or update the token in the database
    if (decodedTokenId)
      await this.dataDB.insertContractToken(
        {
          ...token,
          decodedTokenId,
        },
        'update',
      );
  }
}
