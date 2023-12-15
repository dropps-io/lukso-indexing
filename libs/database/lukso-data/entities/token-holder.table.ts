export interface TokenHolderTable {
  holderAddress: string;
  contractAddress: string;
  tokenId: string | null;
  balanceInWei: string;
  holderSinceBlock: number;
}
