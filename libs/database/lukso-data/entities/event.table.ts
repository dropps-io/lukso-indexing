export interface EventTable {
  id: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  address: string;
  eventName: string | null;
  topic0: string;
  topic1: string | null;
  topic2: string | null;
  topic3: string | null;
  data: string | null;
}
