import { setupEnv } from '@utils/setup-env';
import { getEnvOrConfig, getEnvOrThrow } from '@utils/get-or-throw';

setupEnv();

export const RPC_URL = getEnvOrThrow<string>('RPC_URL');
export const REDIS_URI = getEnvOrThrow<string>('REDIS_URI');
export const WS_PORT = getEnvOrConfig<string>('WS_PORT', 'ws_port');

export const DROP_DB_ON_START = getEnvOrThrow<boolean>('DROP_DB_ON_START', false);

export const IPFS_GATEWAYS = getEnvOrThrow<string>('IPFS_GATEWAYS').split(',');
export const ARWEAVE_GATEWAY = getEnvOrThrow<string>('ARWEAVE_GATEWAY');

export const CRON_PROCESS = getEnvOrConfig<string>('CRON_PROCESS', 'cron_process');
export const CRON_UPDATE = getEnvOrConfig<string>('CRON_UPDATE', 'cron_update');
export const DEFAULT_P_LIMIT = getEnvOrConfig<number>('P_LIMIT', 'p_limit');
export const DEFAULT_BLOCKS_P_LIMIT = getEnvOrConfig<number>('BLOCKS_P_LIMIT', 'blocks_p_limit');
export const DEFAULT_EVENTS_CHUNK_SIZE = getEnvOrConfig<number>(
  'EVENTS_CHUNK_SIZE',
  'events_chunk_size',
);
export const DEFAULT_BLOCKS_CHUNK_SIZE = getEnvOrConfig<number>(
  'BLOCKS_CHUNK_SIZE',
  'blocks_chunk_size',
);

export const DEFAULT_INDEXER_STATUS = getEnvOrConfig<number>(
  'DEFAULT_INDEXER_STATUS',
  'default_indexer_status',
);
