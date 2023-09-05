import { config } from 'dotenv';
import path from 'path';

export const setupEnv = (): void => {
  if (process.env.NODE_ENV === 'test') config({ path: path.resolve(process.cwd(), '.env.test') });
  if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production')
    config({ path: path.resolve(process.cwd(), '.env.prod') });

  config();
};
