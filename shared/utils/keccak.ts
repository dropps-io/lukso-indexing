import { ethers } from 'ethers';

export const keccak = (message: string): string => {
  const messageBytes = ethers.toUtf8Bytes(message);
  return ethers.keccak256(messageBytes);
};
