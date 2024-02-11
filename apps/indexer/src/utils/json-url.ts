import { toUtf8String } from 'ethers';

export const decodeVerifiableUrl = (jsonUrl: string): string => {
  if (jsonUrl.slice(0, 6) === '0x0000') return toUtf8String('0x' + jsonUrl.slice(82));
  // JSONURL -> DEPRECATED BY LUKSO
  else return toUtf8String('0x' + jsonUrl.slice(74));
};
