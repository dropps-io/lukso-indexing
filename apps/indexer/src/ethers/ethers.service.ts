import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import LSP0ERC725Account from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json';

import { RPC_URL } from '../globals';
import { SUPPORTED_STANDARD } from './types/enums';
import { MetadataResponse } from './types/metadata-response';
import { LSP0 } from './contracts/LSP0/LSP0';
import { LSP7 } from './contracts/LSP7/LSP7';
import { LSP4 } from './contracts/LSP4/LSP4';
import { LSP8 } from './contracts/LSP8/LSP8';
import { FetcherService } from '../fetcher/fetcher.service';

@Injectable()
export class EthersService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly logger: winston.Logger;

  public readonly lsp0: LSP0;
  public readonly lsp4: LSP4;
  public readonly lsp7: LSP7;
  public readonly lsp8: LSP8;

  constructor(
    protected readonly fetcherService: FetcherService,
    protected readonly loggerService: LoggerService,
    protected readonly structureDB: LuksoStructureDbService,
  ) {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.logger = loggerService.getChildLogger('Ethers');

    this.lsp0 = new LSP0(fetcherService, this.logger);
    this.lsp4 = new LSP4(fetcherService, this.logger);
    this.lsp7 = new LSP7(this, fetcherService, this.logger);
    this.lsp8 = new LSP8(fetcherService, this.logger);
  }

  public getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  public async getBlockTransactions(blockNumber: number): Promise<string[]> {
    const block = await this.provider.getBlock(blockNumber);
    return block ? [...block.transactions] : [];
  }

  public async getBlockTimestamp(blockNumber: number): Promise<number> {
    const block = await this.provider.getBlock(blockNumber);
    if (!block) throw new Error(`Block ${blockNumber} not found`);
    else return block.timestamp * 1000;
  }

  public async getTransaction(transactionHash: string): Promise<ethers.TransactionResponse> {
    const tx = await this.provider.getTransaction(transactionHash);
    if (!tx) throw new Error(`Transaction ${transactionHash} not found`);
    else return tx;
  }

  public async getTransactionReceipt(transactionHash: string): Promise<ethers.TransactionReceipt> {
    const tx = await this.provider.getTransactionReceipt(transactionHash);
    if (!tx) throw new Error(`Transaction ${transactionHash} not found`);
    else return tx;
  }

  public async getPastLogs(fromBlock: number, toBlock: number): Promise<ethers.Log[]> {
    return await this.provider.getLogs({ fromBlock, toBlock });
  }

  public async getLastBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Finds and returns the contract interface based on the provided contract address.
   *
   * @param {string} address - The address of the contract to find the interface for.
   *
   * @returns {Promise<ContractInterfaceTable|null>} The contract interface for the provided address, or null if not found.
   */
  public async identifyContractInterface(address: string): Promise<ContractInterfaceTable | null> {
    try {
      this.logger.debug(`Identifying contract interface for address ${address}`, { address });
      // Get the bytecode of the contract.
      const contractCode = await this.provider.getCode(address);

      // If no bytecode is found, then it's an EOA.
      if (contractCode === '0x')
        return {
          id: '0x00000000',
          code: 'EOA',
          name: 'Externally Owned Account',
          version: '0',
          type: null,
        };

      const contractInterfaces = await this.structureDB.getContractInterfaces();

      for (const contractInterface of contractInterfaces) {
        // Check if the contract bytecode contains the contract interface id.
        if (contractCode.includes(contractInterface.id.slice(2, 10))) {
          // If there is a match, return the contract interface.
          return contractInterface;
        }
      }

      // If a match was not found, try to get the contract interface using the contract instance.
      const contract = new ethers.Contract(address, LSP0ERC725Account.abi, this.provider);

      for (const contractInterface of contractInterfaces) {
        // Check if the contract instance supports the contract interface.
        try {
          if (await contract.supportsInterface(contractInterface.id)) {
            return contractInterface;
          }
        } catch (e) {
          this.logger.warn(`Error while checking contract interface support: ${e.message}`, {
            address,
          });
          return null;
        }
      }
    } catch (e) {
      this.logger.error(`Error while finding contract interface: ${e.message}`, { address });
      return null;
    }

    return null;
  }

  public async fetchContractMetadata(
    address: string,
    interfaceCode?: string,
  ): Promise<MetadataResponse | null> {
    this.logger.debug(`Fetching metadata for ${address}`, { address });

    const interfaceCodeToUse =
      interfaceCode || (await this.identifyContractInterface(address))?.code;

    switch (interfaceCodeToUse) {
      case SUPPORTED_STANDARD.LSP0:
        return await this.lsp0.fetchData(address);
      case SUPPORTED_STANDARD.LSP7:
        return await this.lsp7.fetchData(address);
      case SUPPORTED_STANDARD.LSP8:
        return await this.lsp4.fetchData(address);
      default:
        return null;
    }
  }

  public async fetchContractTokenMetadata(
    address: string,
    tokenId: string,
    interfaceCode?: string,
  ): Promise<{ metadata: MetadataResponse; decodedTokenId: string } | null> {
    this.logger.debug(
      `Fetching token metadata for ${address}:${tokenId}, ${
        interfaceCode ? `interface code ${interfaceCode}` : ''
      }`,
      {
        address,
        tokenId,
        interfaceCode,
      },
    );

    const interfaceCodeToUse =
      interfaceCode || (await this.identifyContractInterface(address))?.code;

    switch (interfaceCodeToUse) {
      case SUPPORTED_STANDARD.LSP8:
        return await this.lsp8.fetchTokenData(address, tokenId);
      default:
        return null;
    }
  }
}
