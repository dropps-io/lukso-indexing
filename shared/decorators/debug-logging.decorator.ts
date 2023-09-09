import winston from 'winston';

interface ServiceInstance {
  logger: winston.Logger | undefined;
}

export const DebugLogger =
  () =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): void => {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: ServiceInstance, ...args: any[]): any {
      // Log the function call and its arguments
      if (this.logger)
        this.logger.debug(`Called ${propertyKey} with arguments: ${JSON.stringify(args)}`);

      // Call the original method
      return originalMethod.apply(this, args);
    };
  };
