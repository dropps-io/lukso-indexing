import winston from 'winston';

import { REDIS_KEY } from '../redis/redis-keys';
import { RedisService } from '../redis/redis.service';

interface ServiceInstance {
  logger: winston.Logger | undefined;
  redisService: RedisService | undefined;
}

export const ExceptionHandler =
  (shouldThrow = true, logArgs = false, returnValue?: any, redisValueIncr?: REDIS_KEY) =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): void => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: ServiceInstance, ...args: any[]): Promise<any> {
      try {
        return await originalMethod.apply(this, args);
      } catch (e: any) {
        if (this.logger)
          this.logger.error(`Error in ${propertyKey}: ${e.message}`, {
            stack: e.stack,
            ...(logArgs ? argsToObject(args) : {}),
          });
        if (this.redisService && redisValueIncr)
          await this.redisService.incrementNumber(redisValueIncr);

        if (shouldThrow) throw e;
        else if (returnValue !== undefined) return returnValue;
      }
    };
  };

const argsToObject = (args: any[]): { [key: string]: any } => {
  return args.reduce((acc, curr, idx) => {
    acc[`arg${idx + 1}`] = JSON.stringify(curr ?? null);
    return acc;
  }, {});
};
