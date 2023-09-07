import { Injectable } from '@nestjs/common';
import { ContractTokenTable } from '@db/lukso-data/entities/contract-token.table';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';

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

  public async indexToken(token: ContractTokenTable) {
    this.logger.debug(`Indexing token ${token.tokenId} from ${token.address}`, { ...token });

    // Fetch the metadata of the contract token
    const tokenData = await this.ethersService.fetchContractTokenMetadata(
      token.address,
      token.tokenId,
    );

    // If metadata is available, insert or update the token in the database
    // and index the metadata
    if (tokenData) {
      await this.dataDB.insertContractToken(
        {
          ...token,
          decodedTokenId: tokenData.decodedTokenId,
        },
        'update',
      );
      await this.metadataService.indexMetadata(tokenData.metadata);
    } else {
      this.logger.debug(`No metadata found for token ${token.tokenId} from ${token.address}`, {
        ...token,
      });
      await this.dataDB.insertContractToken(
        {
          ...token,
          decodedTokenId: token.tokenId,
        },
        'update',
      );
    }
  }
}
