import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { assertNonEmptyString, assertString } from '@utils/validators';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';

import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { DecodingService } from '../../decoding/decoding.service';
import { parseArrayString } from '../../utils/parse-array-string';

@Injectable()
export class Erc725StandardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly dataDB: LuksoDataDbService,
    private readonly decodingService: DecodingService,
  ) {
    this.logger = this.loggerService.getChildLogger('Erc725Standard');
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
  public async indexDataChanged(address: string, key: string, value: string, blockNumber: number) {
    // Decode the key-value pair
    const decodedKeyValue = await this.decodingService.decodeErc725YKeyValuePair(key, value);

    // Insert the data change into the database
    await this.dataDB.insertDataChanged({
      address,
      key,
      value,
      blockNumber,
      decodedValue: decodedKeyValue?.value || null,
    });
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
}
