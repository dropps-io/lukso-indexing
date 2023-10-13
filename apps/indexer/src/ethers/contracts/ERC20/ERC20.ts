import winston from 'winston';
import { ethers } from 'ethers';

import ERC20Abi from '../../utils/abis/ERC20Abi.json';
import { EthersService } from '../../ethers.service';
import { FetcherService } from '../../../fetcher/fetcher.service';
export class ERC20 {
  private readonly erc20: ERC20;
  constructor(
    protected readonly ethersService: EthersService,
    protected readonly fetcherService: FetcherService,
    protected readonly logger: winston.Logger,
  ) {
    this.erc20 = new ERC20(ethersService, fetcherService, this.logger);
  }

  //Promise type any, need to create new MetadataResponse to erc20
  public async fetchData(address: string): Promise<any | null> {
    try {
      const erc20Data = await this.erc20.fetchData(address);
      return {
        metadata: {
          address,
          tokenId: null,
          name: erc20Data?.metadata.name || null,
          symbol: erc20Data?.metadata.symbol || null,
        },
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
}
