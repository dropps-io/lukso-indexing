import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { assertNonEmptyString, assertString } from '@utils/validators';

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
  public async processSetDataBatchTx(
    address: string,
    blockNumber: number,
    parameters: { [name: string]: DecodedParameter },
  ) {
    try {
      this.logger.debug(
        `Processing setData batch transaction on ${address} at block ${blockNumber}`,
        { address, blockNumber },
      );

      // Extract data keys and values from the transaction parameters
      const dataValues = parseArrayString(parameters.dataValues.value);
      const dataKeys = parseArrayString(parameters.dataKeys.value);

      // Validate data keys and values
      if (
        !dataKeys ||
        !dataValues ||
        dataKeys.length !== dataValues.length ||
        dataKeys.length === 0
      ) {
        this.logger.error('No data keys or values, or dataKeys.length !== dataValues.length', {
          address,
          blockNumber,
          ...parameters,
        });
      }

      // Iterate through the data keys and values, and index the data changes
      for (let i = 0; i < dataKeys.length; i++)
        await this.indexDataChanged(address, dataKeys[i], dataValues[i], blockNumber);
    } catch (e) {
      this.logger.error(
        `Error while processing setData batch transaction on ${address} at block ${blockNumber}: ${e.message}`,
        {
          stack: e.stack,
          address,
          blockNumber,
          parameters: JSON.stringify(parameters),
        },
      );
    }
  }

  /**
   * Processes a setData transaction and indexes the data change.
   *
   * @param address
   * @param blockNumber
   * @param {{ [name: string]: DecodedParameter }} parameters - The decoded parameters of the transaction.
   */
  public async processSetDataTx(
    address: string,
    blockNumber: number,
    parameters: { [name: string]: DecodedParameter },
  ) {
    try {
      this.logger.debug(`Processing setData transaction on ${address}`, { address });

      assertString(parameters.dataValue.value);
      assertNonEmptyString(parameters.dataKey.value);
      await this.indexDataChanged(
        address,
        parameters.dataKey.value,
        parameters.dataValue.value,
        blockNumber,
      );
    } catch (e) {
      this.logger.error(`Processing setData transaction on ${address}: ${e.message}`, {
        stack: e.stack,
        address,
        ...parameters,
      });
    }
  }

  /**
   * Indexes a data change for a given address, key, value, and block number.
   *
   * @param {string} address - The address associated with the data change.
   * @param {string} key - The key associated with the data change.
   * @param {string} value - The value associated with the data change.
   * @param {number} blockNumber - The block number associated with the data change.
   */
  public async indexDataChanged(address: string, key: string, value: string, blockNumber: number) {
    try {
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
    } catch (e) {
      this.logger.error('Error while indexing data changed', {
        address,
        key,
        value,
        blockNumber,
      });
    }
  }
}
