import { ARWEAVE_GATEWAY } from '../globals';
import { getRandomGateway } from './get-random-gateway';

export function formatUrl(url: string) {
  if (!url) return url;
  if (url.includes('ipfs://')) return url.replace('ipfs://', getRandomGateway());
  if (url.includes('ar://')) return url.replace('ar://', ARWEAVE_GATEWAY);
  else return url;
}
