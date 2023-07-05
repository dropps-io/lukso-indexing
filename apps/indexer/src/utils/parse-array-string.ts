export const parseArrayString = (arrayString: string): string[] => {
  if (!arrayString) return [];
  else return arrayString.split(',');
};
