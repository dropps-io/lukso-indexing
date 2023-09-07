import { LSP3Profile } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp3-profile';
import winston from 'winston';
import { LSP3ProfileJson } from '@models/lsp3-profile-json';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';

import { MetadataResponse } from '../../types/metadata-response';
import { METADATA_IMAGE_TYPE } from '../../types/enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';
import { erc725yGetData } from '../utils/erc725y-get-data';
import { decodeJsonUrl } from '../../../utils/json-url';
import { FetcherService } from '../../../fetcher/fetcher.service';

export class LSP0 {
  constructor(
    protected readonly fetcherService: FetcherService,
    protected readonly logger: winston.Logger,
  ) {}

  /**
   * Fetches LSP0 data for the given address and returns a MetadataResponse object.
   *
   * @param {string} address - The address for which LSP0 data should be fetched.
   *
   * @returns {Promise<MetadataResponse>} A promise that resolves to a MetadataResponse object.
   */
  @ExceptionHandler(false, null)
  public async fetchData(address: string): Promise<MetadataResponse | null> {
    this.logger.debug(`Fetching LSP0 data for ${address}`, { address });

    // Fetch the LSP3Profile data from the contract.
    const response = await erc725yGetData(address, ERC725Y_KEY.LSP3_PROFILE);

    if (!response) {
      this.logger.debug(`No LSP0 data found for ${address}`, { address });
      return null;
    }

    const url = decodeJsonUrl(response);

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
      },
      images: [
        ...formatMetadataImages(lsp3Profile.profileImage, METADATA_IMAGE_TYPE.PROFILE),
        ...formatMetadataImages(lsp3Profile.backgroundImage, METADATA_IMAGE_TYPE.BACKGROUND),
      ],
      tags: lsp3Profile.tags || [],
      links: lsp3Profile.links || [],
      assets: [],
    };
  }

  /**
   * Fetches LSP3 Profile from a provided URL.
   *
   * @param {string} url - The URL from which to fetch metadata.
   *
   * @returns {Promise<(LSP3Profile & { name?: string }) | null>} -
   * A promise that resolves to an object containing the profile's metadata, or null if an error occurs.
   */
  @ExceptionHandler(false, null)
  protected async fetchLsp3ProfileFromUrl(url: string): Promise<LSP3Profile | null> {
    const profileMetadata = await this.fetcherService.fetch<LSP3ProfileJson>(url, {}, 3, 0, 5000);

    if (typeof profileMetadata === 'object' && profileMetadata !== null) {
      if ('LSP3Profile' in profileMetadata) {
        // Case when profileMetadata has the shape { LSP3Profile: LSP3Profile }
        return profileMetadata.LSP3Profile;
      } else if (profileMetadata.name || profileMetadata.description) {
        // Case when profileMetadata has the shape of LSP3Profile
        return profileMetadata;
      }
    }

    return null;
  }
}
