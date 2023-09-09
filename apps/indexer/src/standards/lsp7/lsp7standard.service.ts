import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { formatEther } from 'ethers';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';

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

  @DebugLogger()
  public async processTransferEvent(
    event: EventTable,
    parameters: { [name: string]: DecodedParameter },
  ): Promise<void> {
    const { address, blockNumber } = event;
    if (parameters.from.value)
      await this.updateBalance(address, parameters.from.value, blockNumber);
    if (parameters.to.value) await this.updateBalance(address, parameters.to.value, blockNumber);
  }

  @DebugLogger()
  @ExceptionHandler(false, true)
  protected async updateBalance(
    tokenAddress: string,
    holderAddress: string,
    blockNumber: number,
  ): Promise<void> {
    const balance = await this.ethersService.lsp7.balanceOf(tokenAddress, holderAddress);
    const isNFT = await this.ethersService.lsp7.isNFT(tokenAddress);
    await this.dataDB.insertTokenHolder(
      {
        holderAddress,
        contractAddress: tokenAddress,
        tokenId: null,
        balanceInWei: balance,
        balanceInEth: isNFT ? balance : formatEther(balance),
        holderSinceBlock: blockNumber,
      },
      'update',
    );
  }
}
