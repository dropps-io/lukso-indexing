import { config } from 'dotenv';
import path from 'path';

export const setupEnv = () => {
  if (process.env.NODE_ENV === 'test') config({ path: path.resolve(process.cwd(), '.env.test') });

  config();
};
