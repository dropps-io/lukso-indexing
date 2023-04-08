export const parseDecodedParameter = (decodedValue: any): string => {
  if (Array.isArray(decodedValue)) return decodedValue.join(',');
  else return (decodedValue || '') as string;
};
