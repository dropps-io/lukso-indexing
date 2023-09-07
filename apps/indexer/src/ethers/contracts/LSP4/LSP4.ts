import winston from 'winston';
import { LSP4DigitalAsset } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp4-digital-asset';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';
import { toUtf8String } from 'ethers';
import { LSP4DigitalAssetJSON } from '@models/lsp4-digital-asset-json';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { assertNonEmptyString } from '@utils/validators';

import { MetadataResponse } from '../../types/metadata-response';
import { METADATA_IMAGE_TYPE } from '../../types/enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';
import { erc725yGetData } from '../utils/erc725y-get-data';
import { decodeJsonUrl } from '../../../utils/json-url';
import { FetcherService } from '../../../fetcher/fetcher.service';

export class LSP4 {
  constructor(
    protected readonly fetcherService: FetcherService,
    protected readonly logger: winston.Logger,
  ) {}

  @ExceptionHandler(false, null)
  public async fetchData(address: string): Promise<MetadataResponse | null> {
    this.logger.debug(`Fetching LSP4 data for ${address}`, { address });
    let name: string | null = null;
    let symbol: string | null = null;
    let lsp4DigitalAsset: LSP4DigitalAsset | null = null;
    let images: Omit<MetadataImageTable, 'metadataId'>[] = [];

    // each of these fetchData can fail, so we need to catch them separately

    try {
      const fetchedName = await erc725yGetData(address, ERC725Y_KEY.LSP4_TOKEN_NAME);
      assertNonEmptyString(fetchedName, `Invalid token name format: ${fetchedName}`);
      name = toUtf8String(fetchedName);
    } catch (e) {
      this.logger.warn(`Failed to fetch lsp4 name for ${address}: ${e.message}`, { address });
    }

    try {
      const fetchedSymbol = await erc725yGetData(address, ERC725Y_KEY.LSP4_TOKEN_SYMBOL);
      assertNonEmptyString(fetchedSymbol, 'Invalid token symbol format');
      symbol = toUtf8String(fetchedSymbol);
    } catch (e) {
      this.logger.warn(`Failed to fetch lsp4 symbol for ${address}: ${e.message}`, { address });
    }

    try {
      const response = await erc725yGetData(address, ERC725Y_KEY.LSP4_METADATA);

      if (response) {
        const url = decodeJsonUrl(response);
        lsp4DigitalAsset = await this.fetchLsp4MetadataFromUrl(url);

        if (lsp4DigitalAsset) {
          images = [
            ...formatMetadataImages(lsp4DigitalAsset.images, null),
            ...formatMetadataImages(lsp4DigitalAsset.icon, METADATA_IMAGE_TYPE.ICON),
          ];
        }
      }
    } catch (e) {
      this.logger.error(`Failed to fetch lsp4 metadata for ${address}: ${e.message}`, {
        address,
      });
    }

    if (!name && !symbol && !lsp4DigitalAsset) {
      this.logger.debug(`No LSP4 data found for ${address}`, { address });
      return null;
    }

    return {
      metadata: {
        address,
        tokenId: null,
        name,
        description: lsp4DigitalAsset?.description || null,
        symbol: symbol,
        isNFT: null,
      },
      images,
      tags: [],
      links: lsp4DigitalAsset?.links || [],
      assets: lsp4DigitalAsset?.assets || [],
    };
  }

  /**
   * Fetches LSP4 metadata from a provided URL.
   *
   * @param {string} url - The URL from which to fetch metadata.
   *
   * @returns {Promise<(LSP4DigitalAsset & { name?: string }) | null>} -
   * A promise that resolves to an object containing the digital asset's metadata, or null if an error occurs.
   */
  @ExceptionHandler(false, null)
  public async fetchLsp4MetadataFromUrl(
    url: string,
  ): Promise<(LSP4DigitalAsset & { name?: string }) | null> {
    const tokenMetadata = await this.fetcherService.fetch<LSP4DigitalAssetJSON>(
      url,
      {},
      3,
      0,
      5000,
    );

    if ('LSP4Metadata' in tokenMetadata) {
      // Case when tokenMetadata has a shape of { LSP4Metadata: LSP4DigitalAsset & { name?: string } }
      return tokenMetadata.LSP4Metadata;
    } else if (tokenMetadata.name || tokenMetadata.description) {
      // Case when tokenMetadata has a shape of LSP4DigitalAsset & { name?: string }
      return tokenMetadata;
    } else {
      return null;
    }
  }
}
