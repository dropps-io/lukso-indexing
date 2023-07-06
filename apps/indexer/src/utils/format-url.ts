import { IPFS_GATEWAY, ARWEAVE_GATEWAY } from '../globals';

export function formatUrl(url: string) {
  if (!url) return url;
  if (url.includes('ipfs://')) return url.replace('ipfs://', IPFS_GATEWAY);
  if (url.includes('ar://')) return url.replace('ar://', ARWEAVE_GATEWAY);
  else return url;
}
