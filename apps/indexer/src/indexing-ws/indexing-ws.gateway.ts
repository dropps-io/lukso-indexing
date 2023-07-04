import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EventTable } from '@db/lukso-data/entities/event.table';

import { WS_CHANNELS } from './enums';
import { DecodedParameter } from '../decoding/types/decoded-parameter';

@WebSocketGateway()
export class IndexingWsGateway {
  @WebSocketServer()
  private readonly server: Server;

  public emitEvent(event: EventTable, parameters: DecodedParameter[]): void {
    this.server.emit(WS_CHANNELS.EVENT, {
      ...event,
      parameters,
    });
  }
}
