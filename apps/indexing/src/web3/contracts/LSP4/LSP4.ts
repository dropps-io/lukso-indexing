import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import winston from 'winston';
import LSP4DigitalAssetSchema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';
import { LSP4DigitalAsset } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp4-digital-asset';
import { assertNonEmptyString } from '@utils/validators';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';

import { Web3Service } from '../../web3.service';
import { MetadataResponse } from '../../types/contract-metadata';
import { IPFS_GATEWAY } from '../../../globals';
import { LSP4_METADATA, LSP4_TOKEN_NAME, LSP4_TOKEN_SYMBOL } from '../config';
import { METADATA_IMAGE_TYPE } from '../../types/enums';

export class LSP4 {
  constructor(private web3Service: Web3Service, private logger: winston.Logger) {}

  public async fetchData(address: string): Promise<MetadataResponse | null> {
    try {
      // Initialize the ERC725 instance with the appropriate schema, address, provider, and IPFS gateway.
      const erc725 = new ERC725(
        LSP4DigitalAssetSchema as ERC725JSONSchema[],
        address,
        this.web3Service.getWeb3().currentProvider,
        { ipfsGateway: IPFS_GATEWAY },
      );

      let name: string | null = null;
      let symbol: string | null = null;
      let lsp4DigitalAsset: LSP4DigitalAsset | null = null;
      let images: Omit<MetadataImageTable, 'metadataId'>[] = [];

      // each of these fetchData can fail, so we need to catch them separately

      try {
        const fetchData = (await erc725.fetchData(LSP4_TOKEN_NAME)).value;
        assertNonEmptyString(fetchData, 'Invalid token name format');
        name = fetchData;
      } catch (e) {
        this.logger.warn(`Failed to fetch lsp4 name: ${e.message}`, { address });
      }

      try {
        const fetchData = (await erc725.fetchData(LSP4_TOKEN_SYMBOL)).value;
        assertNonEmptyString(fetchData, 'Invalid token symbol format');
        symbol = fetchData;
      } catch (e) {
        this.logger.warn(`Failed to fetch lsp4 symbol: ${e.message}`, { address });
      }

      try {
        lsp4DigitalAsset = (
          (await erc725.fetchData(LSP4_METADATA)).value as unknown as {
            LSP4Metadata: LSP4DigitalAsset;
          }
        )?.LSP4Metadata;

        const formattedImages: Omit<MetadataImageTable, 'metadataId'>[] = lsp4DigitalAsset?.images
          ? lsp4DigitalAsset.images.flat().map((image) => {
              return { ...image, type: null };
            })
          : [];

        const formattedIcons: Omit<MetadataImageTable, 'metadataId'>[] = lsp4DigitalAsset?.icon
          ? lsp4DigitalAsset.icon.flat().map((image) => {
              return { ...image, type: METADATA_IMAGE_TYPE.ICON };
            })
          : [];

        images = [...formattedImages, ...formattedIcons];
      } catch (e) {
        this.logger.warn(`Failed to fetch lsp4 metadata: ${e.message}`, { address });
      }

      if (!name && !symbol && !lsp4DigitalAsset) return null;

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
      this.logger.error(`Error while fetching LSP4 data: ${e.message}`, {
        address,
      });
      return null;
    }
  }
}
