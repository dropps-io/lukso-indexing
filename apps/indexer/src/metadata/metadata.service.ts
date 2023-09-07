import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';

import { MetadataResponse } from '../ethers/types/metadata-response';

@Injectable()
export class MetadataService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
  ) {
    this.logger = this.loggerService.getChildLogger('MetadataService');
  }

  /**
   * Indexes metadata of a contract, including images, tags, links, and assets.
   *
   * @param {MetadataResponse} metadata - The metadata object containing data to be indexed.
   * @returns {Promise<void>}
   */
  public async indexMetadata(metadata: MetadataResponse): Promise<void> {
    try {
      // Insert the main metadata and retrieve the generated ID
      const { id } = await this.dataDB.insertMetadata(metadata.metadata, 'update');

      // Insert related metadata objects into the database
      await this.dataDB.insertMetadataImages(id, metadata.images, 'do nothing');
      await this.dataDB.insertMetadataTags(id, metadata.tags, 'do nothing');
      await this.dataDB.insertMetadataLinks(id, metadata.links, 'do nothing');
      await this.dataDB.insertMetadataAssets(id, metadata.assets, 'do nothing');
    } catch (e) {
      this.logger.error(`Error while indexing metadata: ${e.message}`, {
        address: metadata.metadata.address,
        tokenId: metadata.metadata.tokenId,
      });
    }
  }
}
