import { setupEnv } from '@utils/setup-env';

setupEnv();

export const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.lukso.network';
export const PORT = process.env.WS_PORT || 3002;

export const DROP_DB_ON_START = process.env.DROP_DB_ON_START === 'true';

export const NODE_ENV = process.env.NODE_ENV || 'dev';
export const IPFS_GATEWAY = 'https://2eff.lukso.dev/ipfs/';
export const ARWEAVE_GATEWAY = 'https://arweave.net/';

export const CONTRACTS_PROCESSING_INTERVAL = 1000;
export const CONTRACTS_INDEXING_BATCH_SIZE = 20;
export const TOKENS_INDEXING_BATCH_SIZE = 20;
export const TX_INDEXING_BATCH_SIZE = 20;
export const EVENTS_INDEXING_BATCH_SIZE = 20;
export const BLOCKS_INDEXING_BATCH_SIZE = 100;

//TODO: add getEnvOrThrow
export const REDIS_URI =
  process.env.REDIS_URI || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

export const RESET_LAST_UPDATE_ON_START = process.env.RESET_LAST_UPDATE_ON_START === 'false';
