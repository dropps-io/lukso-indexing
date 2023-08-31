export const getEnv = <T>(key: string): T | undefined => process.env[key] as T | undefined;

export const getEnvOrThrow = <T = string>(key: string, defaultValue?: T): T => {
  const value = process.env[key];

  if (value === undefined && defaultValue !== undefined) return defaultValue;
  else if (value === undefined) throw new Error(`Missing env var ${key}`);

  if (typeof defaultValue === 'boolean' || value === 'true' || value === 'false') {
    return (value === 'true') as unknown as T;
  }

  return value as unknown as T;
};
