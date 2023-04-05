import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import LSP3UniversalProfileMetadataJSON from '@erc725/erc725.js/schemas/LSP3UniversalProfileMetadata.json';
import { LSP3Profile } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp3-profile';
import winston from 'winston';

import { Web3Service } from '../../web3.service';
import { MetadataResponse } from '../../types/contract-metadata';
import { IPFS_GATEWAY } from '../../../globals';
import { METADATA_IMAGE_TYPE } from '../../types/enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';

export class LSP0 {
  constructor(private web3Service: Web3Service, private logger: winston.Logger) {}

  /**
   * Fetches LSP0 data for the given address and returns a MetadataResponse object.
   *
   * @param {string} address - The address for which LSP0 data should be fetched.
   *
   * @returns {Promise<MetadataResponse>} A promise that resolves to a MetadataResponse object.
   */
  public async fetchData(address: string): Promise<MetadataResponse | null> {
    try {
      // Initialize the ERC725 instance with the appropriate schema, address, provider, and IPFS gateway.
      const erc725 = new ERC725(
        LSP3UniversalProfileMetadataJSON as ERC725JSONSchema[],
        address,
        this.web3Service.getWeb3().currentProvider,
        { ipfsGateway: IPFS_GATEWAY },
      );

      // Fetch the LSP3Profile data from the contract.
      const fetchedData = await erc725.fetchData(ERC725Y_KEY.LSP3_PROFILE);

      // Extract the LSP3Profile from the fetched data, if available.
      const lsp3Profile: LSP3Profile | undefined = (
        fetchedData?.value as unknown as { LSP3Profile: LSP3Profile | undefined }
      )?.LSP3Profile;

      // Return null if LSP3Profile data is not found.
      if (!lsp3Profile) return null;

      // Return the MetadataResponse object containing the extracted metadata.
      return {
        metadata: {
          address,
          tokenId: null,
          name: lsp3Profile.name,
          description: lsp3Profile.description,
          symbol: null,
          isNFT: null,
        },
        images: [
          ...formatMetadataImages(lsp3Profile.profileImage, METADATA_IMAGE_TYPE.PROFILE),
          ...formatMetadataImages(lsp3Profile.backgroundImage, METADATA_IMAGE_TYPE.BACKGROUND),
        ],
        tags: lsp3Profile.tags || [],
        links: lsp3Profile.links || [],
        assets: [],
      };
    } catch (e) {
      this.logger.error(`Error while fetching LSP0 data: ${e.message}`, {
        address,
      });
      return null;
    }
  }
}
