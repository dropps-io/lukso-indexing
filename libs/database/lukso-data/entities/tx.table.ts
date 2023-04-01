export interface TransactionTable {
  hash: string;
  nonce: number;
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
  methodId: string;
  methodName: string | null;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gas: number;
}
