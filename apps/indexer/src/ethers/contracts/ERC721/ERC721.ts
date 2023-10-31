import winston from 'winston';
import { ethers } from 'ethers';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { MetadataResponse } from '@shared/types/metadata-response';

import { IPFS_GATEWAYS } from '../../../globals';
import ERC721Abi from '../../utils/abis/ERC721Abi.json';
import { EthersService } from '../../ethers.service';

export class ERC721 {
  constructor(
    protected readonly ethersService: EthersService,
    protected readonly logger: winston.Logger,
  ) {}

  /**
     * Decodes an ERC2721 token ID based on its type.
     *
     * @param {string} address - The contract address of the ERC721 collection.

     * @returns {Promise<MetadataResponse | null>} - The metadata and images associated with the ERC721 token or null if an error occurs.
     */

  //TODO Make types to use in fetchDataFromBaseURI response & erc721GetData
  @DebugLogger()
  @ExceptionHandler(false, true, null)
  public async fetchTokenData(address: string, tokenId: string): Promise<MetadataResponse | null> {
    const metadata = await this.fetchDataFromBaseURI(address, tokenId);

    try {
      return {
        metadata: {
          address,
          tokenId,
          name: metadata?.name || null,
          symbol: null,
          description: metadata?.description || null,
          isNFT: true,
        },
        assets: [],
        tags: [],
        images: [metadata?.image || null],
        links: [],
      };
    } catch (e: any) {
      this.logger.error(`Error while fetching ERC721 data for ${address}: ${e.message}`, {
        address,
      });
      return null;
    }
  }
  protected async fetchDataFromBaseURI(address: string, tokenId: string): Promise<any | null> {
    try {
      const response = await this.erc721GetData(address, tokenId);
      if (!response) {
        throw new Error('Failed to fetch ERC721 data from base URI');
      }
      return response;
    } catch (e: any) {
      this.logger.error(
        `Error while fetching ERC721 data from base URI for ${address}: ${e.message}`,
        {
          address,
        },
      );
      return null;
    }
  }

  erc721GetData = async (address: string, tokenId: string): Promise<any | null> => {
    try {
      const contract = new ethers.Contract(address, ERC721Abi, this.ethersService.getProvider());
      const tokenIPFS = await contract.tokenURI(tokenId);
      const [, tokenURI] = tokenIPFS.split('//');
      const response = await fetch(`${IPFS_GATEWAYS + tokenURI}`);
      if (!response.ok) {
        this.logger.error(
          `Failed to fetch data from IPFS: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      return data;
    } catch (e: any) {
      this.logger.error(`Error while fetching ERC721 data from IPFS for ${address}: ${e.message}`, {
        address,
      });
      return null;
    }
  };
}
