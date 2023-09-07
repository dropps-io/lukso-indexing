import { setupEnv } from '@utils/setup-env';
import { getEnvOrConfig, getEnvOrThrow } from '@utils/get-or-throw';

setupEnv();

export const RPC_URL = getEnvOrThrow<string>('RPC_URL');
export const WS_PORT = getEnvOrConfig<string>('WS_PORT', 'ws_port');

export const DROP_DB_ON_START = getEnvOrThrow<boolean>('DROP_DB_ON_START', false);

export const IPFS_GATEWAYS = getEnvOrThrow<string>('IPFS_GATEWAYS').split(',');
export const ARWEAVE_GATEWAY = getEnvOrThrow<string>('ARWEAVE_GATEWAY');

export const CRON_PROCESS = getEnvOrConfig<string>('CRON_PROCESS', 'cron_process');
export const P_LIMIT = getEnvOrConfig<number>('P_LIMIT', 'p_limit');
export const BLOCKS_P_LIMIT = getEnvOrConfig<number>('BLOCKS_P_LIMIT', 'blocks_p_limit');
export const EVENTS_CHUNK_SIZE = getEnvOrConfig<number>('EVENTS_CHUNK_SIZE', 'events_chunk_size');

export const BLOCKS_CHUNK_SIZE = getEnvOrConfig<number>('BLOCKS_CHUNK_SIZE', 'blocks_chunk_size');
