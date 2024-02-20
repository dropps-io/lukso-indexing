import pLimit from 'p-limit';
import { setTimeout } from 'timers/promises';

const limit = pLimit(1);

export const PreventOverlap =
  (
    timeout: number | null = 30000, // default 30 seconds
  ) =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): void => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const limitedFunction = limit(async () => {
        return await originalMethod.apply(this, args);
      });

      let timeoutPromise: Promise<any> | undefined;

      if (timeout) {
        // Set a timeout for the limited function to release the limit
        timeoutPromise = setTimeout(timeout).then(() => {
          throw new Error(`Timeout after waiting ${timeout / 1000} seconds to prevent overlaps`);
        });
      }

      return await Promise.race(
        timeoutPromise ? [limitedFunction, timeoutPromise] : [limitedFunction],
      );
    };
  };
