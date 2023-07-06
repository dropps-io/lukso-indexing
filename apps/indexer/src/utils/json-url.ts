import { toUtf8String } from 'ethers';

export const decodeJsonUrl = (jsonUrl: string): string => {
  return toUtf8String('0x' + jsonUrl.slice(74));
};
