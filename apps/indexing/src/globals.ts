import { setupEnv } from '@utils/setup-env';

setupEnv();

export const RPC_URL = process.env.RPC_URL || 'https://rpc.l16.lukso.network';
export const NODE_ENV = process.env.NODE_ENV || 'dev';
export const IPFS_GATEWAY = 'https://2eff.lukso.dev/ipfs/';
export const CONTRACTS_PROCESSING_INTERVAL = 1000;
