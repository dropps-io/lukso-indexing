import { Injectable } from '@nestjs/common';
import { ContractTokenTable } from '@db/lukso-data/entities/contract-token.table';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { RedisService } from '@shared/redis/redis.service';

import { EthersService } from '../ethers/ethers.service';
import { MetadataService } from '../metadata/metadata.service';
import { LSP8_TOKEN_ID_TYPE } from '../ethers/contracts/LSP8/enums';
import { decodeLsp8TokenId } from '../decoding/utils/decode-lsp8-token-id';

@Injectable()
export class TokensService {
  protected logger: winston.Logger;

  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly ethersService: EthersService,
    protected readonly redisService: RedisService,
  ) {
    this.logger = this.loggerService.getChildLogger('TokensService');
  }

  @DebugLogger()
  public async indexToken(token: ContractTokenTable) {
    try {
      const decodedTokenId = await this.getDecodedTokenId(token.address, token.tokenId);
      const contract = await this.dataDB.getContractByAddress(token.address);

      await this.dataDB.insertContractToken(
        {
          ...token,
          decodedTokenId,
        },
        'update',
      );

      await this.redisService.addAssetToRefreshDataStream(
        token.address,
        token.tokenId,
        contract?.interfaceCode || undefined,
      );
    } catch (error) {
      this.logger.error(`Decoding token for ${token.tokenId} ${error}`);
      await this.dataDB.insertContractToken(
        {
          ...token,
          decodedTokenId: token.tokenId,
        },
        'update',
      );
    }
  }

  protected async getDecodedTokenId(address: string, tokenId: string): Promise<string> {
    const tokenIdType: LSP8_TOKEN_ID_TYPE = await this.ethersService.lsp8.fetchTokenIdType(address);
    return decodeLsp8TokenId(tokenId, tokenIdType);
  }
}
