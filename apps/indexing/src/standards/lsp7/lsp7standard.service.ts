import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { fromWei } from 'web3-utils';

import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { Web3Service } from '../../web3/web3.service';

@Injectable()
export class Lsp7standardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly web3Service: Web3Service,
    private readonly dataDB: LuksoDataDbService,
  ) {
    this.logger = this.loggerService.getChildLogger('Erc725Standard');
  }

  public async processTransferEvent(
    event: EventTable,
    parameters: { [name: string]: DecodedParameter },
  ): Promise<void> {
    try {
      const updateBalance = async (holderAddress: string) => {
        const balance = await this.web3Service.lsp7.balanceOf(event.address, holderAddress);
        const isNFT = await this.web3Service.lsp7.isNFT(event.address);
        await this.dataDB.insertTokenHolder(
          {
            holderAddress,
            contractAddress: event.address,
            tokenId: null,
            balanceInWei: balance,
            balanceInEth: isNFT ? parseInt(balance) : parseInt(fromWei(balance)),
            holderSinceBlock: event.blockNumber,
          },
          'update',
        );
      };

      if (parameters.from.value) await updateBalance(parameters.from.value);
      if (parameters.to.value) await updateBalance(parameters.to.value);
    } catch (e) {
      this.logger.error(`Error while processing transfer event: ${e.message}`, {
        stack: e.stack,
        ...event,
        ...parameters,
      });
    }
  }
}
