import { LSP3Profile } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp3-profile';
import winston from 'winston';

import { MetadataResponse } from '../../types/metadata-response';
import { METADATA_IMAGE_TYPE } from '../../types/enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';
import { erc725yGetData } from '../utils/erc725y-get-data';
import { formatUrl } from '../../../utils/format-url';
import { decodeJsonUrl } from '../../../utils/json-url';

export class LSP0 {
  constructor(private logger: winston.Logger) {}

  /**
   * Fetches LSP0 data for the given address and returns a MetadataResponse object.
   *
   * @param {string} address - The address for which LSP0 data should be fetched.
   *
   * @returns {Promise<MetadataResponse>} A promise that resolves to a MetadataResponse object.
   */
  public async fetchData(address: string): Promise<MetadataResponse | null> {
    try {
      this.logger.debug(`Fetching LSP0 data for ${address}`, { address });

      // Fetch the LSP3Profile data from the contract.
      const response = await erc725yGetData(address, ERC725Y_KEY.LSP3_PROFILE);

      if (!response) {
        this.logger.debug(`No LSP0 data found for ${address}`, { address });
        return null;
      }

      const url = formatUrl(decodeJsonUrl(response));

      // Extract the LSP3Profile from the fetched data, if available.
      const lsp3Profile = await this.fetchLsp3ProfileFromUrl(url);

      // Return null if LSP3Profile data is not found.
      if (!lsp3Profile) {
        this.logger.debug(`No LSP0 data found for ${address}`, { address });
        return null;
      }

      // Return the MetadataResponse object containing the extracted metadata.
      return {
        metadata: {
          address,
          tokenId: null,
          name: lsp3Profile.name,
          description: lsp3Profile.description,
          symbol: null,
          isNFT: null,
          isHistorical: null,
          version: null,
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
      this.logger.error(`Error while fetching LSP0 data for ${address}: ${e.message}`, {
        address,
      });
      return null;
    }
  }

  /**
   * Fetches LSP3 Profile from a provided URL.
   *
   * @param {string} url - The URL from which to fetch metadata.
   *
   * @returns {Promise<(LSP3Profile & { name?: string }) | null>} -
   * A promise that resolves to an object containing the profile's metadata, or null if an error occurs.
   */
  protected async fetchLsp3ProfileFromUrl(url: string): Promise<LSP3Profile | null> {
    try {
      // Attempt to fetch the token metadata from the given URL
      const profileMetadata = await fetch(url);

      // Convert the metadata response to JSON
      const profileMetadataJson = await profileMetadata.json();

      if (profileMetadataJson && profileMetadataJson.LSP3Profile)
        return profileMetadataJson.LSP3Profile;
      else if (profileMetadataJson && (profileMetadataJson.name || profileMetadataJson.description))
        return profileMetadataJson;
      else return null;
    } catch (e) {
      // If an error occurs, log a warning with the URL and return null
      this.logger.warn(`Failed to fetch LSP3 Profile from ${url}`);
      return null;
    }
  }
}
