import { setupEnv } from '@utils/setup-env';

setupEnv();

export const NODE_ENV = process.env.NODE_ENV || 'dev';
export const PORT = process.env.API_PORT || 3001;
