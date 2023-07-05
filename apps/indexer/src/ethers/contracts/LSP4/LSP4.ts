import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import winston from 'winston';
import LSP4DigitalAssetSchema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';
import { LSP4DigitalAsset } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp4-digital-asset';
import { assertNonEmptyString } from '@utils/validators';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';

import { MetadataResponse } from '../../types/metadata-response';
import { IPFS_GATEWAY, RPC_URL } from '../../../globals';
import { METADATA_IMAGE_TYPE } from '../../types/enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';

export class LSP4 {
  constructor(private logger: winston.Logger) {}

  public async fetchData(address: string): Promise<MetadataResponse | null> {
    try {
      this.logger.debug(`Fetching LSP4 data for ${address}`, { address });

      // Initialize the ERC725 instance with the appropriate schema, address, provider, and IPFS gateway.
      const erc725 = new ERC725(LSP4DigitalAssetSchema as ERC725JSONSchema[], address, RPC_URL, {
        ipfsGateway: IPFS_GATEWAY,
      });

      let name: string | null = null;
      let symbol: string | null = null;
      let lsp4DigitalAsset: LSP4DigitalAsset | null = null;
      let images: Omit<MetadataImageTable, 'metadataId'>[] = [];

      // each of these fetchData can fail, so we need to catch them separately

      try {
        const fetchedName = (await erc725.fetchData(ERC725Y_KEY.LSP4_TOKEN_NAME)).value;
        assertNonEmptyString(fetchedName, `Invalid token name format: ${fetchedName}`);
        name = fetchedName;
      } catch (e) {
        this.logger.warn(`Failed to fetch lsp4 name for ${address}: ${e.message}`, { address });
      }

      try {
        const fetchedSymbol = (await erc725.fetchData(ERC725Y_KEY.LSP4_TOKEN_SYMBOL)).value;
        assertNonEmptyString(fetchedSymbol, 'Invalid token symbol format');
        symbol = fetchedSymbol;
      } catch (e) {
        this.logger.warn(`Failed to fetch lsp4 symbol for ${address}: ${e.message}`, { address });
      }

      try {
        lsp4DigitalAsset = (
          (await erc725.fetchData(ERC725Y_KEY.LSP4_METADATA)).value as unknown as {
            LSP4Metadata: LSP4DigitalAsset;
          }
        )?.LSP4Metadata;

        images = [
          ...formatMetadataImages(lsp4DigitalAsset.images, null),
          ...formatMetadataImages(lsp4DigitalAsset.icon, METADATA_IMAGE_TYPE.ICON),
        ];
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
    } catch (e) {
      this.logger.error(`Error while fetching LSP4 data for ${address}: ${e.message}`, {
        address,
      });
      return null;
    }
  }
}
