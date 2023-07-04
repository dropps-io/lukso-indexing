import { Injectable } from '@nestjs/common';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';

import { DecodedParameter } from '../decoding/types/decoded-parameter';
import { EVENTS_TO_ROUTE, TX_TO_ROUTE } from './enums';
import { convertDecodedParamToMapping } from '../decoding/utils/convert-decoded-param-to-mapping';
import { Lsp8standardService } from '../standards/lsp8/lsp8standard.service';
import { Erc725StandardService } from '../standards/erc725/erc725-standard.service';
import { Lsp7standardService } from '../standards/lsp7/lsp7standard.service';

@Injectable()
export class BlockchainActionRouterService {
  protected readonly logger: winston.Logger;

  constructor(
    private readonly lsp8Service: Lsp8standardService,
    private readonly lsp7Service: Lsp7standardService,
    private readonly erc725Service: Erc725StandardService,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getChildLogger('BlockchainActionRouterService');
  }

  async routeEvent(event: EventTable, decodedParameters: DecodedParameter[]): Promise<void> {
    this.logger.debug(
      `Routing event ${event.transactionHash}:${event.logIndex} of methodId ${event.methodId} to appropriate service`,
      {
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        methodId: event.methodId,
      },
    );

    const paramsMap = convertDecodedParamToMapping(decodedParameters);
    switch (event.topic0) {
      case EVENTS_TO_ROUTE.DATA_CHANGED:
        break;
      case EVENTS_TO_ROUTE.LSP8_TRANSFER:
        await this.lsp8Service.processTokenRelatedEvent(event, paramsMap);
        break;
      case EVENTS_TO_ROUTE.LSP7_TRANSFER:
        await this.lsp7Service.processTransferEvent(event, paramsMap);
        break;
    }
  }

  async routeTransaction(
    from: string,
    to: string,
    blockNumber: number,
    methodId: string,
    decodedParameters: DecodedParameter[],
  ): Promise<void> {
    const paramsMap = convertDecodedParamToMapping(decodedParameters);
    switch (methodId) {
      case TX_TO_ROUTE.SET_DATA:
        await this.erc725Service.processSetDataTx(to, blockNumber, paramsMap);
        break;
      case TX_TO_ROUTE.SET_DATA_BATCH:
        await this.erc725Service.processSetDataBatchTx(to, blockNumber, paramsMap);
        break;
    }
  }
}
