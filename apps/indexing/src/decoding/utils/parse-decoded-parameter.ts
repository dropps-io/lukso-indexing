export const parseDecodedParameter = (decodedValue: any): string => {
  if (Array.isArray(decodedValue)) return decodedValue.join(',');
  else if (typeof decodedValue === 'bigint') return decodedValue.toString();
  else return (decodedValue || '') as string;
};
