import pLimit from 'p-limit';

export const promiseAllPLimit = async (promises: Promise<any>[], pLimit_: number) => {
  const limit = pLimit(pLimit_);
  return await Promise.all(promises.map((promise) => () => limit(() => promise)));
};

export const promiseAllSettledPLimit = async (promises: Promise<any>[], pLimit_: number) => {
  const limit = pLimit(pLimit_);
  return await Promise.allSettled(promises.map((promise) => () => limit(() => promise)));
};
