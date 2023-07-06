import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { formatEther } from 'ethers';

import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { EthersService } from '../../ethers/ethers.service';

@Injectable()
export class Lsp7standardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly ethersService: EthersService,
    private readonly dataDB: LuksoDataDbService,
  ) {
    this.logger = this.loggerService.getChildLogger('Erc725Standard');
  }

  public async processTransferEvent(
    event: EventTable,
    parameters: { [name: string]: DecodedParameter },
  ): Promise<void> {
    try {
      this.logger.debug(`Processing transfer event ${event.transactionHash}:${event.logIndex}`, {
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
      });
      const updateBalance = async (holderAddress: string) => {
        this.logger.debug(`Updating balance of ${event.address} for ${holderAddress}`);

        const balance = await this.ethersService.lsp7.balanceOf(event.address, holderAddress);
        const isNFT = await this.ethersService.lsp7.isNFT(event.address);
        await this.dataDB.insertTokenHolder(
          {
            holderAddress,
            contractAddress: event.address,
            tokenId: null,
            balanceInWei: balance,
            balanceInEth: isNFT ? balance : formatEther(balance),
            holderSinceBlock: event.blockNumber,
          },
          'update',
        );
      };

      if (parameters.from.value) await updateBalance(parameters.from.value);
      if (parameters.to.value) await updateBalance(parameters.to.value);
    } catch (e) {
      this.logger.error(
        `Error while processing transfer event ${event.transactionHash}:${event.logIndex}: ${e.message}`,
        {
          stack: e.stack,
          ...event,
          ...parameters,
        },
      );
    }
  }
}
