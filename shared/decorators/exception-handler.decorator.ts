export const ExceptionHandler =
  (shouldThrow = true, returnValue?: any) =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): void => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        return await originalMethod.apply(this, args);
      } catch (e) {
        this.logger.error(`Error in ${propertyKey}: ${e.message}`, { stack: e.stack });

        if (shouldThrow) throw e;
        else if (returnValue !== undefined) return returnValue;
      }
    };
  };
