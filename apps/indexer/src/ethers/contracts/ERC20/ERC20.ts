import winston from 'winston';
import { ethers } from 'ethers';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { MetadataResponse } from '@shared/types/metadata-response';
import ERC725Y_artifact from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json';

import ERC20Abi from '../../utils/abis/ERC20Abi.json';
import { EthersService } from '../../ethers.service';
import { FetcherService } from '../../../fetcher/fetcher.service';
export class ERC20 {
  constructor(
    protected readonly ethersService: EthersService,
    protected readonly fetcherService: FetcherService,
    protected readonly logger: winston.Logger,
  ) {}

  /**
   * Decodes an ERC20 token ID based on its type.
   *
   * @param {string} address - The contract address of the ERC20 collection.

   * @returns {Promise<ERC20MetadataResponse | null>} - The metadata and images associated with the ERC20 token or null if an error occurs.
   */

  @DebugLogger()
  @ExceptionHandler(false, true, null)
  public async fetchData(address: string): Promise<MetadataResponse | null> {
    try {
      const erc20Data = await this.getERC20Contract;
      return {
        metadata: {
          address,
          tokenId: null,
          name: erc20Data?.name || null,
          symbol: null,
          description: null,
          isNFT: null,
        },
        assets: [],
        tags: [],
        images: [],
        links: [],
      };
    } catch (e: any) {
      this.logger.error(`Error while fetching ERC20 data for ${address}: ${e.message}`, {
        address,
      });
      return null;
    }
  }

  public async balanceOf(address: string, holderAddress: string): Promise<string> {
    const erc20contract = this.getERC20Contract(address);
    const balanceOf = await erc20contract.balanceOf(holderAddress);
    return balanceOf.toString();
  }

  private getERC20Contract(address: string) {
    return new ethers.Contract(address, ERC20Abi, this.ethersService.getProvider());
  }

  private async getERC20Metadata(address: string, dataKey: string): Promise<string | null> {
    const contract = new ethers.Contract(address, ERC20Abi, this.ethersService.getProvider());
    const response = await contract.getData(dataKey);
    if (!response || response === '0x') return null;
    else return response;
  }
}
