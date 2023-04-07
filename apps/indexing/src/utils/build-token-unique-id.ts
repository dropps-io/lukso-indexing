import { keccak256 } from 'web3-utils';

export const buildTokenUniqueId = (transactionHash: string, tokenId: string): string => {
  return keccak256(transactionHash + tokenId);
};
