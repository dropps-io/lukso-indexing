import { setupEnv } from '@utils/setup-env';
import { getEnvOrThrow } from '@utils/get-or-throw';

setupEnv();

export const NODE_ENV = getEnvOrThrow('NODE_ENV');
export const PORT = getEnvOrThrow('API_PORT');
export const ADDRESS_PAGE_SIZE = 10;
