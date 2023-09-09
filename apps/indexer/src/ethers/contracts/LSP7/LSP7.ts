import winston from 'winston';
import LSP7DigitalAsset from '@lukso/lsp-smart-contracts/artifacts/LSP7DigitalAsset.json';
import { ethers } from 'ethers';

import { EthersService } from '../../ethers.service';
import { MetadataResponse } from '../../types/metadata-response';
import { LSP4 } from '../LSP4/LSP4';
import { FetcherService } from '../../../fetcher/fetcher.service';
export class LSP7 {
  private readonly lsp4: LSP4;
  constructor(
    protected readonly ethersService: EthersService,
    protected readonly fetcherService: FetcherService,
    protected readonly logger: winston.Logger,
  ) {
    this.lsp4 = new LSP4(fetcherService, this.logger);
  }

  public async fetchData(address: string): Promise<MetadataResponse | null> {
    try {
      this.logger.debug(`Fetching LSP7 data for ${address}`, { address });

      const lsp4Data = await this.lsp4.fetchData(address);
      const isNFT = await this.isNFT(address);

      return {
        metadata: {
          address,
          tokenId: null,
          name: lsp4Data?.metadata.name || null,
          description: lsp4Data?.metadata.description || null,
          symbol: lsp4Data?.metadata.symbol || null,
          isNFT,
        },
        images: lsp4Data?.images || [],
        tags: [],
        links: lsp4Data?.links || [],
        assets: lsp4Data?.assets || [],
      };
    } catch (e: any) {
      this.logger.error(`Error while fetching LSP7 data for ${address}: ${e.message}`, {
        address,
      });
      return null;
    }
  }

  public async isNFT(address: string): Promise<boolean> {
    const lsp7contract = this.getLSP7Contract(address);
    return (await lsp7contract.decimals()).toString() === '0';
  }

  public async balanceOf(address: string, holderAddress: string): Promise<string> {
    const lsp7contract = this.getLSP7Contract(address);
    const balanceOf = await lsp7contract.balanceOf(holderAddress);
    return balanceOf.toString();
  }

  private getLSP7Contract(address: string) {
    return new ethers.Contract(address, LSP7DigitalAsset.abi, this.ethersService.getProvider());
  }
}
