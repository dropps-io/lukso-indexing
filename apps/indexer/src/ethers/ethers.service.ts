import { Injectable } from '@nestjs/common';
import { ethers, TransactionReceipt, TransactionResponse } from 'ethers';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import LSP0ERC725Account from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';

import { RPC_URL } from '../globals';
import { LSP0 } from './contracts/LSP0/LSP0';
import { LSP7 } from './contracts/LSP7/LSP7';
import { LSP4 } from './contracts/LSP4/LSP4';
import { LSP8 } from './contracts/LSP8/LSP8';
import { ERC20 } from './contracts/ERC20/ERC20';
import { FetcherService } from '../fetcher/fetcher.service';
import { eoaContractInterface } from './utils/eoa-interface';

@Injectable()
export class EthersService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly logger: winston.Logger;

  public readonly lsp0: LSP0;
  public readonly lsp4: LSP4;
  public readonly lsp7: LSP7;
  public readonly lsp8: LSP8;
  public readonly erc20: ERC20;

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
    this.erc20 = new ERC20(this, fetcherService, this.logger);
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

  public async getTransaction(transactionHash: string): Promise<TransactionResponse> {
    const tx = await this.provider.getTransaction(transactionHash);
    if (!tx) throw new Error(`Transaction ${transactionHash} not found`);
    else return tx;
  }

  public async getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
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
  @ExceptionHandler(false, true, null)
  public async identifyContractInterface(address: string): Promise<ContractInterfaceTable | null> {
    this.logger.debug(`Identifying contract interface for address ${address}`, { address });
    // Get the bytecode of the contract.
    const contractCode = await this.provider.getCode(address);

    // If no bytecode is found, then it's an EOA.
    if (contractCode === '0x') return eoaContractInterface;

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
      } catch (e: any) {
        this.logger.warn(`Error while checking contract interface support: ${e.message}`, {
          address,
        });
        return null;
      }
    }
    return null;
  }
}
