import pLimit from 'p-limit';
const limit = pLimit(1); // Initialize outside of the decorator

export const PreventOverlap =
  () =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): void => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const limitedFunction = limit(async () => {
        return await originalMethod.apply(this, args);
      });

      return await limitedFunction;
    };
  };
