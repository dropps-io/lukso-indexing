export interface TransactionTable {
  hash: string;
  nonce: number;
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
  methodId: string;
  methodName?: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gas: number;
  unwrappedMethodId?: string;
  unwrappedMethodName?: string;
  unwrappedFrom?: string;
  unwrappedTo?: string;
}
