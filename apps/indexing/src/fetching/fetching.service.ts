import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

@Injectable()
export class FetchingService {
  private readonly web3: Web3;

  constructor() {
    this.web3 = new Web3('<YOUR_WEB3_PROVIDER_URL>');
  }

  async getPastEvents(contractAddress: string, fromBlock: number, toBlock: number) {
    const options = {
      address: contractAddress,
      fromBlock,
      toBlock,
    };

    return await this.web3.eth.getPastLogs(options);
  }

  async getTransaction(transactionHash: string) {
    return await this.web3.eth.getTransaction(transactionHash);
  }
}
