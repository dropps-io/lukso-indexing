import winston from 'winston';
import { AbiItem } from 'web3-utils';
import LSP7DigitalAsset from '@lukso/lsp-smart-contracts/artifacts/LSP7DigitalAsset.json';

import { Web3Service } from '../../web3.service';
import { MetadataResponse } from '../../types/contract-metadata';
import { LSP4 } from '../LSP4/LSP4';
export class LSP7 {
  private readonly lsp4: LSP4;
  constructor(private web3Service: Web3Service, private logger: winston.Logger) {
    this.lsp4 = new LSP4(web3Service, logger);
  }

  public async fetchData(address: string): Promise<MetadataResponse | null> {
    const lsp4Data = await this.lsp4.fetchData(address);
    let isNFT = false;

    try {
      const lsp7contract = new (this.web3Service.getWeb3().eth.Contract)(
        LSP7DigitalAsset.abi as AbiItem[],
        address,
      );
      isNFT = (await lsp7contract.methods.decimals().call()) === '0';

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
    } catch (e) {
      this.logger.error(`Error while fetching LSP4 data: ${e.message}`, {
        address,
      });
      return null;
    }
  }
}
