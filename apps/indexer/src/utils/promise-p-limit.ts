import pLimit from 'p-limit';
import winston from 'winston';

export const promiseAllPLimit = async (promises: Promise<any>[], pLimit_: number) => {
  const limit = pLimit(pLimit_);
  return await Promise.all(promises.map((promise) => () => limit(() => promise)));
};

type OnError = {
  logger?: winston.Logger;
  logSeverity?: 'error' | 'warn' | 'info' | 'debug';
  throw?: boolean;
  return?: any;
};

export const promiseAllSettledPLimit = async (
  promises: Promise<any>[],
  pLimit_: number,
  onError: OnError = {},
) => {
  const limit = pLimit(pLimit_);
  const results = await Promise.allSettled(promises.map((promise) => () => limit(() => promise)));

  results.forEach((result) => {
    if (result.status === 'rejected') {
      if (onError.logger)
        onError.logger[onError.logSeverity ?? 'error'](`Task failed with error: ${result.reason}`);
      if (onError.throw) throw new Error(result.reason);
      if (onError.return !== undefined) return onError.return;
    }
  });

  return results;
};
