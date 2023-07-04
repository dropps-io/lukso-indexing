import { keccak256, toUtf8Bytes } from 'ethers';

export const buildLogId = (transactionHash: string, logIndex: number): string => {
  return keccak256(toUtf8Bytes(transactionHash + logIndex));
};
