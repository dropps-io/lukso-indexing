export const splitIntoChunks = <T>(arrayToSplit: T[], nbrOfChunks: number): T[][] => {
  const result: T[][] = [];
  for (let i = nbrOfChunks; i > 0; i--) {
    result.push(arrayToSplit.splice(0, Math.ceil(arrayToSplit.length / i)));
  }
  return result;
};
