import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

@Injectable()
export class DecodingService {
  private readonly web3: Web3;

  constructor() {
    this.web3 = new Web3();
  }
}
