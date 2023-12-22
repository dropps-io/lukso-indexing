export interface MetadataTable {
  id: number;
  address: string;
  eventHash: string;
  tokenId: string | null;
  name: string | null;
  symbol: string | null;
  description: string | null;
  blockNumber: string | null;
  isNFT: boolean | null;
}
