import winston from 'winston';
import { ethers } from 'ethers';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { MetadataResponse } from '@shared/types/metadata-response';

import ERC20Abi from '../../utils/abis/ERC20Abi.json';
import { EthersService } from '../../ethers.service';

export class ERC20 {
  constructor(
    protected readonly ethersService: EthersService,
    protected readonly logger: winston.Logger,
  ) {}

  /**
   * Decodes an ERC20 token ID based on its type.
   *
   * @param {string} address - The contract address of the ERC20 collection.

   * @returns {Promise<MetadataResponse | null>} - The metadata and images associated with the ERC20 token or null if an error occurs.
   */

  @DebugLogger()
  @ExceptionHandler(false, true, null)
  public async fetchData(address: string): Promise<MetadataResponse | null> {
    return {
      metadata: {
        address,
        tokenId: null,
        name: (await this.getName(address)) || null,
        symbol: (await this.getSymbol(address)) || null,
        description: null,
        isNFT: null,
      },
      assets: [],
      tags: [],
      images: [],
      links: [],
    };
  }

  @DebugLogger()
  @ExceptionHandler(false, true, null)
  public async balanceOf(address: string, holderAddress: string): Promise<string | null> {
    const erc20contract = this.getERC20Contract(address);
    return await erc20contract.balanceOf(holderAddress);
  }

  @DebugLogger()
  @ExceptionHandler(false, true, null)
  public async getName(address: string): Promise<string | null> {
    const erc20contract = this.getERC20Contract(address);
    return await erc20contract.name();
  }
  @DebugLogger()
  @ExceptionHandler(false, true, null)
  public async getSymbol(address: string): Promise<string | null> {
    const erc20contract = this.getERC20Contract(address);
    return await erc20contract.symbol();
  }

  private getERC20Contract(address: string) {
    return new ethers.Contract(address, ERC20Abi, this.ethersService.getProvider());
  }
}
