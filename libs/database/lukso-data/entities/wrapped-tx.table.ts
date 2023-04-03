export interface WrappedTransactionTable {
  id: number;
  parentTransactionHash: string | null;
  parentId: number | null;
  from: string;
  to: string;
  value: string;
  methodId: string;
  methodName: string;
}
