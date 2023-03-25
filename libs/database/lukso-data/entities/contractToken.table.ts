export interface ContractTokenTable {
  id: string; // keccak(address + rawTokenId)
  address: string;
  index: number;
  tokenId: string;
  rawTokenId: string;
}
