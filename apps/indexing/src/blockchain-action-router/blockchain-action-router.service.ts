import { Injectable } from '@nestjs/common';
import { EventTable } from '@db/lukso-data/entities/event.table';

import { DecodedParameter } from '../decoding/types/decoded-parameter';
import { EVENTS_TO_ROUTE } from './enums';
import { convertDecodedParamToMapping } from '../decoding/utils/convert-decoded-param-to-mapping';
import { Lsp8standardService } from '../standards/lsp8/lsp8standard.service';

@Injectable()
export class BlockchainActionRouterService {
  constructor(private readonly lsp8Service: Lsp8standardService) {}

  async routeEvent(event: EventTable, decodedParameters: DecodedParameter[]): Promise<void> {
    const paramsMap = convertDecodedParamToMapping(decodedParameters);
    switch (event.topic0) {
      case EVENTS_TO_ROUTE.DATA_CHANGED:
        break;
      case EVENTS_TO_ROUTE.LSP8_TRANSFER:
        await this.lsp8Service.processTokenRelatedEvent(event, paramsMap);
        break;
    }
  }
}
