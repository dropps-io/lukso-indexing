import { setupEnv } from '@utils/setup-env';
import config from 'config';

setupEnv();

export const getEnv = <T>(key: string): T | undefined => process.env[key] as T | undefined;

export const getEnvOrThrow = <T>(key: string, defaultValue?: T): T => {
  const value = process.env[key];
  if (value === undefined && defaultValue) return defaultValue;
  else if (value === undefined) throw new Error(`Missing env var ${key}`);
  else return value as T;
};

export const getConfigOrThrow = <T>(key: string): T => {
  const value = config.get(key);
  if (value === undefined) throw new Error(`Missing config ${key}`);
  else return value as T;
};

export const getEnvOrConfig = <T>(envKey: string, configKey: string): T => {
  let value = process.env[envKey];
  if (value === undefined) value = config.get(configKey);

  if (value !== undefined) return value as T;
  else throw new Error(`Missing env var ${envKey} & config ${configKey}`);
};
