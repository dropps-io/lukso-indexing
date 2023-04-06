import { keccak256 } from 'web3-utils';

export const buildLogId = (transactionHash: string, logIndex: number): string => {
  return keccak256(transactionHash + logIndex);
};
