import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { DB_DATA_TABLE } from '@db/lukso-data/config';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { MetadataResponse } from '@shared/types/metadata-response';

import { SUPPORTED_STANDARD } from '../ethers/types/enums';
import { EthersService } from '../ethers/ethers.service';
import { defaultMetadata } from '../ethers/utils/default-metadata-response';

@Injectable()
export class MetadataService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly ethersService: EthersService,
  ) {
    this.logger = this.loggerService.getChildLogger('MetadataService');
  }

  public async indexContractMetadata(address: string, interfaceCode?: string): Promise<void> {
    const metadata = await this.fetchContractMetadata(address, interfaceCode);
    await this.insertMetadata(metadata || defaultMetadata(address));
  }

  public async indexContractTokenMetadata(
    address: string,
    tokenId: string,
    interfaceCode?: string,
  ): Promise<void> {
    const res = await this.fetchContractTokenMetadata(address, tokenId, interfaceCode);
    await this.insertMetadata(res || defaultMetadata(address));
  }

  /**
   * Indexes metadata of a contract, including images, tags, links, and assets.
   *
   * @param {MetadataResponse} metadata - The metadata object containing data to be indexed.
   * @returns {Promise<void>}
   */
  @ExceptionHandler(false, true)
  protected async insertMetadata(metadata: MetadataResponse): Promise<void> {
    const { id } = await this.dataDB.insertMetadata(metadata.metadata, 'update');

    // Insert related metadata objects into the database
    await this.dataDB.deleteMetadataTableItems(id, DB_DATA_TABLE.METADATA_IMAGE);
    await this.dataDB.insertMetadataImages(id, metadata.images, 'do nothing');

    await this.dataDB.deleteMetadataTableItems(id, DB_DATA_TABLE.METADATA_TAG);
    await this.dataDB.insertMetadataTags(id, metadata.tags, 'do nothing');

    await this.dataDB.deleteMetadataTableItems(id, DB_DATA_TABLE.METADATA_LINK);
    await this.dataDB.insertMetadataLinks(id, metadata.links, 'do nothing');

    await this.dataDB.deleteMetadataTableItems(id, DB_DATA_TABLE.METADATA_ASSET);
    await this.dataDB.insertMetadataAssets(id, metadata.assets, 'do nothing');
  }

  protected async fetchContractMetadata(
    address: string,
    interfaceCode?: string,
  ): Promise<MetadataResponse | null> {
    this.logger.debug(`Fetching metadata for ${address}`, { address });

    const interfaceCodeToUse =
      interfaceCode || (await this.ethersService.identifyContractInterface(address))?.code;

    switch (interfaceCodeToUse) {
      case SUPPORTED_STANDARD.LSP0:
        return await this.ethersService.lsp0.fetchData(address);
      case SUPPORTED_STANDARD.LSP7:
        return await this.ethersService.lsp7.fetchData(address);
      case SUPPORTED_STANDARD.LSP8:
        return await this.ethersService.lsp4.fetchData(address);
      case SUPPORTED_STANDARD.ERC20:
        return await this.ethersService.erc20.fetchData(address);
      default:
        return null;
    }
  }

  @DebugLogger()
  protected async fetchContractTokenMetadata(
    address: string,
    tokenId: string,
    interfaceCode?: string,
  ): Promise<MetadataResponse | null> {
    const interfaceCodeToUse =
      interfaceCode || (await this.ethersService.identifyContractInterface(address))?.code;

    switch (interfaceCodeToUse) {
      case SUPPORTED_STANDARD.LSP8:
        return await this.ethersService.lsp8.fetchTokenData(address, tokenId);
      default:
        return null;
    }
  }
}
