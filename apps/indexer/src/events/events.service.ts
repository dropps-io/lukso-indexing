import { Injectable } from '@nestjs/common';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { EVENT_TOPIC } from '@models/enums';
import { Log } from 'ethers';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { DecodedParameter } from '../decoding/types/decoded-parameter';
import { convertDecodedParamToMapping } from '../decoding/utils/convert-decoded-param-to-mapping';
import { Lsp7standardService } from '../standards/lsp7/lsp7standard.service';
import { Lsp8standardService } from '../standards/lsp8/lsp8standard.service';
import { buildLogId } from '../utils/build-log-id';
import { DecodingService } from '../decoding/decoding.service';
import { IndexingWsGateway } from '../indexing-ws/indexing-ws.gateway';
import { EthersService } from '../ethers/ethers.service';

@Injectable()
export class EventsService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly lsp8Service: Lsp8standardService,
    protected readonly lsp7Service: Lsp7standardService,
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
  public async indexEvent(log: Log) {
    try {
      this.logger.debug(`Indexing log ${log.transactionHash}:${log.index}`, {
        transactionHash: log.transactionHash,
        logIndex: log.index,
      });

      // Generate a unique log ID based on the transaction hash and log index
      const logId = buildLogId(log.transactionHash, log.index);

      // Extract the method ID from the log topics
      const methodId = log.topics[0].slice(0, 10);

      // Check if the event has already been indexed
      const eventAlreadyIndexed = await this.dataDB.getEventById(logId);
      if (eventAlreadyIndexed) {
        this.logger.debug(`Log ${log.transactionHash}:${log.index} already indexed, exiting...`, {
          transactionHash: log.transactionHash,
          logIndex: log.index,
        });
        return;
      }

      // Retrieve the event interface using the method ID
      const eventInterface = await this.structureDB.getMethodInterfaceById(methodId);

      const timestamp = await this.ethersService.getBlockTimestamp(log.blockNumber);

      const eventRow: EventTable = {
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

      // Insert the event data into the database
      await this.dataDB.insertEvent(eventRow);

      // Insert the contract without interface if it doesn't exist, so it will be treated by the other recursive process
      await this.dataDB.insertContract(
        { address: log.address, interfaceVersion: null, interfaceCode: null, type: null },
        'do nothing',
      );

      // Decode the log parameters using DecodingService
      const decodedParameters = await this.decodingService.decodeLogParameters(log.data, [
        ...log.topics,
      ]);

      this.indexingWebSocket.emitEvent(eventRow, decodedParameters || []);

      // If decoded parameters are present, insert them into the database
      if (decodedParameters) {
        await this.dataDB.insertEventParameters(logId, decodedParameters, 'do nothing');
        await this.routeEvent(eventRow, decodedParameters);
      }
    } catch (e) {
      this.logger.error(`Error while indexing log: ${e.message}`, {
        transactionHash: log.transactionHash,
        logIndex: log.index,
        stack: e.stack,
      });
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

    const paramsMap = convertDecodedParamToMapping(decodedParameters);
    switch (event.topic0) {
      case EVENT_TOPIC.DATA_CHANGED:
        break;
      case EVENT_TOPIC.LSP8_TRANSFER:
        await this.lsp8Service.processTokenRelatedEvent(event, paramsMap);
        break;
      case EVENT_TOPIC.LSP7_TRANSFER:
        await this.lsp7Service.processTransferEvent(event, paramsMap);
        break;
    }
  }
}
