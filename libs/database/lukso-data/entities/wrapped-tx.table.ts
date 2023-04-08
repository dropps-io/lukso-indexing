export interface WrappedTxTable {
  id: number;
  parentTransactionHash: string | null;
  parentId: number | null;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  methodId: string;
  methodName: string | null;
}
