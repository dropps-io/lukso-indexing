import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { EventTable } from '@db/lukso-data/entities/event.table';

import { MetadataService } from '../../metadata/metadata.service';
import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { buildTokenUniqueId } from '../../utils/build-token-unique-id';
import { SUPPORTED_STANDARD } from '../../ethers/types/enums';
import { promiseAllSettledPLimit } from '../../utils/promise-p-limit';
import { P_LIMIT } from '../../globals';

@Injectable()
export class Erc721StandardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly dataDB: LuksoDataDbService,
    private readonly metadataService: MetadataService,
  ) {
    this.logger = this.loggerService.getChildLogger('Erc721Standard');
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
        interfaceCode: SUPPORTED_STANDARD.ERC721,
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
        this.metadataService.indexContractTokenMetadata(
          address,
          tokenId,
          SUPPORTED_STANDARD.ERC721,
        ),
      ),
      P_LIMIT,
    );
  }
}
