import { ARWEAVE_GATEWAY, IPFS_GATEWAYS } from '../../apps/indexer/src/globals';

export function formatUrl(url: string, ipfsGateway = IPFS_GATEWAYS[0]) {
  if (!url) return url;
  else if (url.includes('ipfs://')) return url.replace('ipfs://', ipfsGateway);
  else if (url.includes('/ipfs/')) return url.replace('/ipfs/', ipfsGateway);
  else if (url.includes('ar://')) return url.replace('ar://', ARWEAVE_GATEWAY);
  else return url;
}
