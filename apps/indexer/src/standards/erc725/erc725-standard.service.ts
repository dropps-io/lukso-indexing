import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { assertNonEmptyString, assertString } from '@utils/validators';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { EventTable } from '@db/lukso-data/entities/event.table';

import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { DecodingService } from '../../decoding/decoding.service';
import { parseArrayString } from '../../utils/parse-array-string';
import { ERC725Y_KEY } from '../../ethers/contracts/config';
import { MetadataService } from '../../metadata/metadata.service';
import { SUPPORTED_STANDARD } from '../../ethers/types/enums';
import { Lsp8standardService } from '../lsp8/lsp8standard.service';

@Injectable()
export class Erc725StandardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly dataDB: LuksoDataDbService,
    private readonly decodingService: DecodingService,
    protected readonly metadataService: MetadataService,
    protected readonly lsp8Service: Lsp8standardService,
  ) {
    this.logger = this.loggerService.getChildLogger('Erc725Standard');
  }

  @DebugLogger()
  @ExceptionHandler(false, true)
  public async processDataChangedEvent(
    event: EventTable,
    parameters: { [name: string]: DecodedParameter },
  ) {
    const dataKey = parameters.dataKey.value;
    const dataValue = parameters.dataValue.value;
    assertNonEmptyString(dataKey);
    assertString(dataValue);

    await this.indexDataChanged(event.address, dataKey, dataValue, event.blockNumber);
  }

  /**
   * Processes a setData batch transaction and indexes the data changes.
   *
   * @param address
   * @param blockNumber
   * @param {{ [name: string]: DecodedParameter }} parameters - The decoded parameters of the transaction.
   */
  @DebugLogger()
  @ExceptionHandler(false, true)
  public async processSetDataBatchTx(
    address: string,
    blockNumber: number,
    parameters: { [name: string]: DecodedParameter },
  ) {
    // Extract data keys and values from the transaction parameters
    const dataValues = parseArrayString((parameters.dataValues || parameters.values).value);
    const dataKeys = parseArrayString((parameters.dataKeys || parameters.keys).value);

    this.validateBatchDataKeysAndValues(dataKeys, dataValues);

    // Iterate through the data keys and values, and index the data changes
    for (let i = 0; i < dataKeys.length; i++)
      await this.indexDataChanged(address, dataKeys[i], dataValues[i], blockNumber);
  }

  /**
   * Processes a setData transaction and indexes the data change.
   *
   * @param address
   * @param blockNumber
   * @param {{ [name: string]: DecodedParameter }} parameters - The decoded parameters of the transaction.
   */
  @DebugLogger()
  @ExceptionHandler(false, true)
  public async processSetDataTx(
    address: string,
    blockNumber: number,
    parameters: { [name: string]: DecodedParameter },
  ) {
    assertString(parameters.dataValue.value);
    assertNonEmptyString(parameters.dataKey.value);
    await this.indexDataChanged(
      address,
      (parameters.dataKey || parameters.key).value,
      (parameters.dataValue || parameters.value).value,
      blockNumber,
    );
  }

  /**
   * Indexes a data change for a given address, key, value, and block number.
   *
   * @param {string} address - The address associated with the data change.
   * @param {string} key - The key associated with the data change.
   * @param {string} value - The value associated with the data change.
   * @param {number} blockNumber - The block number associated with the data change.
   */
  @DebugLogger()
  @ExceptionHandler(false, true)
  protected async indexDataChanged(
    address: string,
    key: string,
    value: string,
    blockNumber: number,
  ) {
    const decodedKeyValue = await this.decodingService.decodeErc725YKeyValuePair(key, value);

    try {
      // Insert the data change into the database
      await this.dataDB.insertDataChanged({
        address,
        key,
        value,
        blockNumber,
        decodedValue: decodedKeyValue?.value || null,
      });
    } catch (error: any) {
      if (!JSON.stringify(error.message).includes('duplicate')) throw error;
    }

    await this.routeDataChanged(address, blockNumber, key, value, decodedKeyValue?.value);
  }

  protected validateBatchDataKeysAndValues(dataKeys: string[], dataValues: string[]): void {
    if (
      !dataKeys ||
      !dataValues ||
      dataKeys.length !== dataValues.length ||
      dataKeys.length === 0
    ) {
      throw 'No data keys or values, or dataKeys.length !== dataValues.length';
    }
  }

  protected async routeDataChanged(
    address: string,
    blockNumber: number,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    decodedValue?: string,
  ): Promise<void> {
    switch (key.slice(0, 26)) {
      case ERC725Y_KEY.LSP3_PROFILE.slice(0, 26):
        return await this.metadataService.indexContractMetadata(value, SUPPORTED_STANDARD.LSP0);
      case ERC725Y_KEY.LSP4_METADATA.slice(0, 26):
        return await this.metadataService.indexContractMetadata(value, address);
      case ERC725Y_KEY.LSP4_TOKEN_NAME.slice(0, 26):
      case ERC725Y_KEY.LSP4_TOKEN_SYMBOL.slice(0, 26):
        return await this.metadataService.indexContractMetadata(value, address);
      case ERC725Y_KEY.LSP8_METADATA_JSON.slice(0, 26):
      case ERC725Y_KEY.LSP8_METADATA_JSON_LEGACY.slice(0, 26):
        return await this.lsp8Service.processTokensMetadataChanges(address, key.slice(26));
      case ERC725Y_KEY.LSP8_TOKEN_METADATA_BASE_URI.slice(0, 26):
        return await this.lsp8Service.processTokensMetadataChanges(address);
    }
  }
}
