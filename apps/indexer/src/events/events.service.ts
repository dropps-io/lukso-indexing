import { Injectable } from '@nestjs/common';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { EVENT_TOPIC } from '@shared/types/enums';
import { Log } from 'ethers';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { MethodInterfaceTable } from '@db/lukso-structure/entities/methodInterface.table';

import { DecodedParameter } from '../decoding/types/decoded-parameter';
import { decodedParamToMapping } from '../decoding/utils/decoded-param-to-mapping';
import { Lsp7standardService } from '../standards/lsp7/lsp7standard.service';
import { Lsp8standardService } from '../standards/lsp8/lsp8standard.service';
import { buildLogId } from '../utils/build-log-id';
import { DecodingService } from '../decoding/decoding.service';
import { IndexingWsGateway } from '../indexing-ws/indexing-ws.gateway';
import { EthersService } from '../ethers/ethers.service';
import { methodIdFromInput } from '../utils/method-id-from-input';
import { Erc725StandardService } from '../standards/erc725/erc725-standard.service';
import { Erc20standardService } from '../standards/erc20/erc20standard.service';

@Injectable()
export class EventsService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly lsp8Service: Lsp8standardService,
    protected readonly lsp7Service: Lsp7standardService,
    protected readonly erc20Service: Erc20standardService,
    protected readonly erc725Service: Erc725StandardService,
    protected readonly decodingService: DecodingService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly indexingWebSocket: IndexingWsGateway,
    protected readonly ethersService: EthersService,
  ) {
    this.logger = this.loggerService.getChildLogger('EventsService');
  }

  /**
   * Indexes a single event log entry.
   * This method handles event log indexing by checking if the event has already been indexed,
   * retrieving event details, decoding event parameters, and updating the database accordingly.
   *
   * @param {Log} log - The log object containing event data.
   */
  @DebugLogger()
  @ExceptionHandler(false, true)
  public async indexEvent(log: Log) {
    const logId = buildLogId(log.transactionHash, log.index);
    const methodId = methodIdFromInput(log.topics[0]);

    if (await this.eventAlreadyIndexed(logId, log)) return;

    const eventInterface = await this.structureDB.getMethodInterfaceById(methodId);
    const timestamp = await this.ethersService.getBlockTimestamp(log.blockNumber);
    const eventRow = this.prepareEventRow(log, logId, methodId, eventInterface, timestamp);

    await this.insertEventData(eventRow, log);

    const decodedParameters = await this.decodingService.decodeLogParameters(log.data, [
      ...log.topics,
    ]);
    await this.handleDecodedParameters(logId, eventRow, decodedParameters || []);

    this.indexingWebSocket.emitEvent(eventRow, decodedParameters || []);
  }

  private async eventAlreadyIndexed(logId: string, log: Log): Promise<boolean> {
    const eventAlreadyIndexed = await this.dataDB.getEventById(logId);
    if (eventAlreadyIndexed) {
      this.logger.debug(`Log ${log.transactionHash}:${log.index} already indexed, exiting...`, {
        transactionHash: log.transactionHash,
        logIndex: log.index,
      });
      return true;
    }
    return false;
  }

  private prepareEventRow(
    log: Log,
    logId: string,
    methodId: string,
    eventInterface: MethodInterfaceTable | null,
    timestamp: number,
  ): EventTable {
    return {
      ...log,
      logIndex: log.index,
      date: new Date(timestamp),
      id: logId,
      eventName: eventInterface?.name || null,
      methodId,
      topic0: log.topics[0],
      topic1: log.topics.length > 1 ? log.topics[1] : null,
      topic2: log.topics.length > 2 ? log.topics[2] : null,
      topic3: log.topics.length > 3 ? log.topics[3] : null,
    };
  }

  private async insertEventData(eventRow: EventTable, log: Log) {
    await this.dataDB.insertEvent(eventRow);
    await this.dataDB.insertContract(
      { address: log.address, interfaceVersion: null, interfaceCode: null, type: null },
      'do nothing',
    );
  }

  private async handleDecodedParameters(
    logId: string,
    eventRow: EventTable,
    decodedParameters: DecodedParameter[],
  ) {
    if (decodedParameters) {
      await this.dataDB.insertEventParameters(logId, decodedParameters, 'do nothing');
      await this.routeEvent(eventRow, decodedParameters);
    }
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

    const paramsMap = decodedParamToMapping(decodedParameters);
    switch (event.topic0) {
      case EVENT_TOPIC.DATA_CHANGED:
        await this.erc725Service.processDataChangedEvent(event, paramsMap);
        break;
      case EVENT_TOPIC.LSP8_TRANSFER:
        await this.lsp8Service.processTokenRelatedEvent(event, paramsMap);
        break;
      case EVENT_TOPIC.LSP7_TRANSFER:
        await this.lsp7Service.processTransferEvent(event, paramsMap);
        break;
      case EVENT_TOPIC.ERC20_TRANSFER:
        await this.erc20Service.processTransferEvent(event, paramsMap);
        break;
    }
  }
}
