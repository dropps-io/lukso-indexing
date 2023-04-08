import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { EventTable } from '@db/lukso-data/entities/event.table';

import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { buildTokenUniqueId } from '../../utils/build-token-unique-id';
import { SUPPORTED_STANDARD } from '../../web3/types/enums';

@Injectable()
export class Lsp8standardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly dataDB: LuksoDataDbService,
  ) {
    this.logger = this.loggerService.getChildLogger('Erc725Standard');
  }

  public async processTokenRelatedEvent(
    event: EventTable,
    parameters: { [name: string]: DecodedParameter },
  ): Promise<void> {
    try {
      const tokenId = parameters.tokenId.value;

      if (!tokenId) return;
      else
        await this.dataDB.insertContractToken(
          {
            address: event.address,
            tokenId,
            id: buildTokenUniqueId(event.address, tokenId),
            decodedTokenId: null,
            interfaceCode: SUPPORTED_STANDARD.LSP8,
          },
          'do nothing',
        );
      this.loggerService.incrementIndexedCount('token');
    } catch (e) {
      this.logger.error(`Error while processing token related event: ${e.message}`, {
        stack: e.stack,
        ...event,
        ...parameters,
      });
    }
  }
}
