import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';

import { WS_CHANNELS } from './enums';
import { DecodedParameter } from '../decoding/types/decoded-parameter';

@WebSocketGateway()
export class IndexingWsGateway {
  protected readonly logger: winston.Logger;

  constructor(protected readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getChildLogger('IndexingWsGateway');
  }

  @WebSocketServer()
  private readonly server: Server;

  public emitEvent(event: EventTable, parameters: DecodedParameter[]): void {
    this.logger.debug(
      `Emitting event ${event.transactionHash}:${event.logIndex} to WS clients on channel ${WS_CHANNELS.EVENT}`,
      { transactionHash: event.transactionHash, logIndex: event.logIndex },
    );
    this.server.emit(WS_CHANNELS.EVENT, {
      ...event,
      parameters,
    });
  }
}
