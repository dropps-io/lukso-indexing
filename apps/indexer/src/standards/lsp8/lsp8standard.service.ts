import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { RedisService } from '@shared/redis/redis.service';
import { REDIS_KEY } from '@shared/redis/redis-keys';

import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { buildTokenUniqueId } from '../../utils/build-token-unique-id';
import { SUPPORTED_STANDARD } from '../../ethers/types/enums';
import { promiseAllSettledPLimit } from '../../utils/promise-p-limit';
import { DEFAULT_P_LIMIT } from '../../globals';
import { MetadataService } from '../../metadata/metadata.service';
@Injectable()
export class Lsp8standardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly dataDB: LuksoDataDbService,
    private readonly redisService: RedisService,
  ) {
    this.logger = this.loggerService.getChildLogger('Erc725Standard');
  }

  @ExceptionHandler(false, true)
  @DebugLogger()
  public async processTokenRelatedEvent(
    event: EventTable,
    parameters: { [name: string]: DecodedParameter },
  ): Promise<void> {
    const tokenId = parameters.tokenId.value;
    const newOwner = parameters.to.value;

    if (!tokenId) return;

    await this.dataDB.insertContractToken(
      {
        address: event.address,
        tokenId,
        id: buildTokenUniqueId(event.address, tokenId),
        decodedTokenId: null,
        interfaceCode: SUPPORTED_STANDARD.LSP8,
        latestKnownOwner: newOwner || null,
      },
      'update',
    );
  }

  public async processTokensMetadataChanges(address: string, partTokenId?: string) {
    const tokens = await this.dataDB.getContractTokens(address, partTokenId);
    const tokenIds = tokens.map((token) => token.tokenId);
    await promiseAllSettledPLimit(
      tokenIds.map((tokenId) =>
        this.redisService.addAssetToRefreshDataStream(address, tokenId, SUPPORTED_STANDARD.LSP8),
      ),
      await this.getPLimit(),
    );
  }

  protected async getPLimit(): Promise<number> {
    const value = await this.redisService.getNumber(REDIS_KEY.P_LIMIT);
    return value || DEFAULT_P_LIMIT;
  }
}
