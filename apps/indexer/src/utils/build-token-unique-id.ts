import { keccak256, toUtf8Bytes } from 'ethers';

export const buildTokenUniqueId = (transactionHash: string, tokenId: string): string => {
  return keccak256(toUtf8Bytes(transactionHash + tokenId));
};
