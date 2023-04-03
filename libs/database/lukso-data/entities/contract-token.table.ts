export interface ContractTokenTable {
  id: string; // keccak(address + tokenId)
  address: string;
  index: number;
  decodedTokenId: string;
  tokenId: string;
}
