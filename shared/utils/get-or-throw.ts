import { setupEnv } from '@utils/setup-env';
import config from 'config';

setupEnv();

const parseValue = <T>(value: any, defaultValue?: T): T | undefined => {
  if (typeof defaultValue === 'boolean') {
    return (value === 'true') as unknown as T;
  }
  if (typeof defaultValue === 'number') {
    return parseFloat(value) as unknown as T;
  }
  return value as T;
};

export const getEnv = <T>(key: string): T | undefined => {
  const value = process.env[key];
  return parseValue<T>(value);
};

export const getEnvOrThrow = <T>(key: string, defaultValue?: T): T => {
  const value = process.env[key];
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if (value === undefined) throw new Error(`Missing env var ${key}`);
  return parseValue(value, defaultValue) as T;
};

export const getConfigOrThrow = <T>(key: string): T => {
  const value = config.get(key);
  if (value === undefined) throw new Error(`Missing config ${key}`);
  return value as T;
};

export const getEnvOrConfig = <T>(envKey: string, configKey: string, defaultValue?: T): T => {
  let value = process.env[envKey];
  if (value === undefined) value = config.get(configKey);
  if (value !== undefined) return parseValue(value, defaultValue) as T;
  throw new Error(`Missing env var ${envKey} & config ${configKey}`);
};
