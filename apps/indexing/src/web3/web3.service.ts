import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { Transaction, Log } from 'web3-core';

import { RPC_URL } from '../globals';

@Injectable()
export class Web3Service {
  private readonly web3: Web3;

  constructor() {
    this.web3 = new Web3(RPC_URL);
  }

  getWeb3(): Web3 {
    return this.web3;
  }

  async getBlockTransactions(blockNumber: number): Promise<string[]> {
    const block = await this.web3.eth.getBlock(blockNumber);
    return block.transactions;
  }

  async getTransaction(transactionHash: string): Promise<Transaction> {
    return await this.web3.eth.getTransaction(transactionHash);
  }

  async getPastLogs(fromBlock: number, toBlock: number): Promise<Log[]> {
    return await this.web3.eth.getPastLogs({ fromBlock: fromBlock, toBlock: toBlock });
  }

  async getLastBlock(): Promise<number> {
    return await this.web3.eth.getBlockNumber();
  }
}
