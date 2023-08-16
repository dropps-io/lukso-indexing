import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { assertNonEmptyString, assertString } from '@utils/validators';
import { EventTable } from '@db/lukso-data/entities/event.table';
import { keccak } from '@utils/keccak';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';
import { MetadataAssetTable } from '@db/lukso-data/entities/metadata-asset.table';
import { MetadataLinkTable } from '@db/lukso-data/entities/metadata-link.table';

import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { DecodingService } from '../../decoding/decoding.service';
import { parseArrayString } from '../../utils/parse-array-string';
import { EthersService } from '../../ethers/ethers.service';
import { ERC725Y_KEY } from '../../ethers/contracts/config';

@Injectable()
export class Erc725StandardService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly loggerService: LoggerService,
    private readonly dataDB: LuksoDataDbService,
    private readonly decodingService: DecodingService,
    private readonly ethersService: EthersService,
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
      const dataValues = parseArrayString((parameters.dataValues || parameters.values).value);
      const dataKeys = parseArrayString((parameters.dataKeys || parameters.keys).value);

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
        (parameters.dataKey || parameters.key).value,
        (parameters.dataValue || parameters.value).value,
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

  public async processDataChangedEvent(
    event: EventTable,
    parameters: { [name: string]: DecodedParameter },
  ) {
    const { address, blockNumber } = event;

    this.logger.debug(`Processing dataChanged event on ${address}`, { address });

    try {
      assertString(parameters.key.value);
      assertString(parameters.value.value);

      if (parameters.key.value === ERC725Y_KEY.LSP3_PROFILE.slice(0, 26)) {
        await this.processLSP3ProfileChangeEvent(address, parameters.value.value);
      }

      await this.indexDataChanged(
        address,
        parameters.key.value,
        parameters.value.value,
        blockNumber,
      );

      this.logger.info(`Processed dataChanged event on ${address} successfully`);
    } catch (e) {
      this.logger.error(`Processing dataChanged event on ${address}: ${e.message}`, {
        stack: e.stack,
        address,
        ...parameters,
      });
    }
  }

  private async processLSP3ProfileChangeEvent(address: string, value: string) {
    if (value === '0x') {
      await this.dataDB.markMetadataAsHistorical(address);
      return;
    }

    const profile = await fetch(value).then((res) => res.json());
    await this.compareAndUpdateMetadata(address, profile);
  }

  private updateIfChanged(
    type: string,
    newValueHash: string,
    oldValueHash: string,
    updateAction: () => Promise<void>,
  ) {
    if (newValueHash !== oldValueHash) {
      updateAction();
    }
  }

  private async handleMetadataUpdate(address: string, newMetadata: any) {
    await this.dataDB.markMetadataAsHistorical(address);

    const oldMetadata = await this.dataDB.getMetadata(address);
    newMetadata.version = (parseInt(oldMetadata?.version || '0', 10) + 1).toString();
    await this.dataDB.insertMetadata(newMetadata, 'update');
  }

  private async compareAndUpdateMetadata(address: string, newProfile: any) {
    const oldMetadata = await this.dataDB.getMetadata(address);

    // Default values for related metadata.
    let oldImages: MetadataImageTable[] = [];
    let oldTags: string[] = [];
    let oldLinks: MetadataLinkTable[] = [];
    let oldAssets: MetadataAssetTable[] = [];

    function hashObject(obj: any): string {
      return keccak(JSON.stringify(obj));
    }

    // If oldMetadata is available and its ID is defined, fetch the related data.
    if (oldMetadata?.id !== undefined) {
      [oldImages, oldTags, oldLinks, oldAssets] = await Promise.all([
        this.dataDB.getMetadataImagesByMetadataId(oldMetadata.id),
        this.dataDB.getMetadataTagsByMetadataId(oldMetadata.id),
        this.dataDB.getMetadataLinks(oldMetadata.id),
        this.dataDB.getMetadataAssetsByMetadataId(oldMetadata.id),
      ]);
    }

    // Update main and related metadata based on detected changes.
    this.updateIfChanged('metadata', hashObject(newProfile.metadata), hashObject(oldMetadata), () =>
      this.handleMetadataUpdate(address, newProfile.metadata),
    );

    // Only proceed with related metadata updates if oldMetadata ID is defined.
    if (oldMetadata?.id !== undefined) {
      this.updateIfChanged('images', hashObject(newProfile.images), hashObject(oldImages), () =>
        this.dataDB.insertMetadataImages(oldMetadata.id, newProfile.images, 'do nothing'),
      );

      this.updateIfChanged('tags', hashObject(newProfile.tags), hashObject(oldTags), () =>
        this.dataDB.insertMetadataTags(oldMetadata.id, newProfile.tags, 'do nothing'),
      );

      this.updateIfChanged('links', hashObject(newProfile.links), hashObject(oldLinks), () =>
        this.dataDB.insertMetadataLinks(oldMetadata.id, newProfile.links, 'do nothing'),
      );

      this.updateIfChanged('assets', hashObject(newProfile.assets), hashObject(oldAssets), () =>
        this.dataDB.insertMetadataAssets(oldMetadata.id, newProfile.assets, 'do nothing'),
      );
    }
  }
}
