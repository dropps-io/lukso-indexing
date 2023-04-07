import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { Transaction, Log } from 'web3-core';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';
import { AbiItem } from 'web3-utils';
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

@Injectable()
export class Web3Service {
  private readonly web3: Web3;
  private readonly logger: winston.Logger;

  private readonly lsp0: LSP0;
  private readonly lsp4: LSP4;
  private readonly lsp7: LSP7;
  private readonly lsp8: LSP8;

  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly structureDB: LuksoStructureDbService,
  ) {
    this.web3 = new Web3(RPC_URL);
    this.logger = loggerService.getChildLogger('Web3');

    this.lsp0 = new LSP0(this, this.logger);
    this.lsp4 = new LSP4(this, this.logger);
    this.lsp7 = new LSP7(this, this.logger);
    this.lsp8 = new LSP8(this, this.logger);
  }

  public getWeb3(): Web3 {
    return this.web3;
  }

  public async getBlockTransactions(blockNumber: number): Promise<string[]> {
    const block = await this.web3.eth.getBlock(blockNumber);
    return block.transactions;
  }

  public async getTransaction(transactionHash: string): Promise<Transaction> {
    return await this.web3.eth.getTransaction(transactionHash);
  }

  public async getPastLogs(fromBlock: number, toBlock: number): Promise<Log[]> {
    return await this.web3.eth.getPastLogs({ fromBlock: fromBlock, toBlock: toBlock });
  }

  public async getLastBlock(): Promise<number> {
    return await this.web3.eth.getBlockNumber();
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
      // Get the bytecode of the contract.
      const contractCode = await this.web3.eth.getCode(address);

      // If mo bytecode is found, then it's an EOA.
      if (contractCode === '0x')
        return { id: '0x00000000', code: 'EOA', name: 'Externally Owned Account', version: '0' };

      const contractInterfaces = await this.structureDB.getContractInterfaces();

      for (const contractInterface of contractInterfaces) {
        // Check if the contract bytecode contains the contract interface id.
        if (contractCode.includes(contractInterface.id.slice(2, 10))) {
          // If there is a match, return the contract interface.
          return contractInterface;
        }
      }

      // If a match was not found, try to get the contract interface using the contract instance.
      const contract = new this.web3.eth.Contract(LSP0ERC725Account.abi as AbiItem[], address);

      for (const contractInterface of contractInterfaces) {
        // Check if the contract instance supports the contract interface.
        if (await contract.methods.supportsInterface(contractInterface.id).call()) {
          return contractInterface;
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
