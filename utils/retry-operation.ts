/**
 * Retries an asynchronous operation with exponential backoff and jitter, tailored for backend services connecting to Redis.
 *
 * Usage:
 * ```typescript
 * const abortController = new AbortController();
 *
 * try {
 *   await retryOperation({
 *     fn: asyncFunctionToRetry,
 *     nonRetryableErrors: ['data-related-error', 'another-specific-error'],
 *     jitterStrategy: 'full', // or 'decorrelated' or custom function
 *     abortController: abortController,
 *     logger: console // or any logger with `warn` and `error` methods
 *   });
 * } catch (err) {
 *   console.error(err.message);
 * }
 *
 * // To abort the retry operation before all retries are exhausted:
 * abortController.abort();
 * ```
 *
 * @param options Configuration options for the retry operation.
 * @returns Promise that resolves with the result of the operation.
 */

export async function retryOperation<T>(options: RetryOptions<T>): Promise<T> {
  const {
    fn,
    maxRetries = 3,
    baseDelay = 500,
    delayMultiplier = 2,
    maxDelay = 15000,
    jitterStrategy = 'full',
    abortController,
    logger,
    nonRetryableErrors = [],
  } = options;

  let retries = 0;

  // eslint-disable-next-line prefer-const
  let delayTimes: number[] = [];

  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (e) {
      retries++;

      if (abortController && abortController.signal.aborted) {
        throw new Error('Retry operation aborted');
      }

      if (nonRetryableErrors.includes(e.message)) {
        throw e;
      }

      // Log retry attempts
      logger && logger.warn(`Attempt ${retries} failed. Retrying... Error: ${e.message}`);

      if (retries === maxRetries) {
        logger && logger.error(`Retry metrics: ${JSON.stringify({ retries, delays: delayTimes })}`);
        throw new Error(`Reached max retries (${maxRetries}) with last error: ${e.message}`);
      }

      const calculatedDelay = Math.min(baseDelay * Math.pow(delayMultiplier, retries), maxDelay);
      const jitter =
        typeof jitterStrategy === 'function'
          ? jitterStrategy(calculatedDelay)
          : jitterStrategy === 'full'
          ? Math.random() * calculatedDelay
          : calculateDecorrelatedJitter(calculatedDelay, baseDelay);
      const delay = Math.min(calculatedDelay + jitter, maxDelay);

      delayTimes.push(delay);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Reached max retries (${maxRetries}) without success`);
}

function calculateDecorrelatedJitter(calculatedDelay: number, baseDelay: number): number {
  return Math.min(calculatedDelay, Math.random() * (baseDelay + calculatedDelay));
}

interface RetryOptions<T> {
  fn: () => Promise<T>;
  maxRetries?: number;
  baseDelay?: number;
  delayMultiplier?: number;
  maxDelay?: number;
  jitterStrategy?: 'full' | 'decorrelated' | ((calculatedDelay: number) => number);
  abortController?: AbortController;
  logger?: {
    warn: (message: string) => void;
    error: (message: string) => void;
  };
  nonRetryableErrors?: string[];
}
