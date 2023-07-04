import { buildLogId } from './build-log-id';

describe('utils', () => {
  describe('buildLogId', () => {
    it('should return the correct Keccak256 hash', () => {
      const transactionHash = '0x1234';
      const logIndex = 1;

      const expectedHash = '0x41fe486a8d544b5078a3fab83c3220e71f2d0187f0a0a4ef7717141881a38856';

      const result = buildLogId(transactionHash, logIndex);

      expect(result).toEqual(expectedHash);
    });

    it('should return the correct Keccak256 hash', () => {
      const transactionHash = '0x1234';
      const logIndex = 123;

      const expectedHash = '0x83489ca2397a1abf7338b161aa72ad4c5b2e1b2d281980b3692c5030ccdd7fba';

      const result = buildLogId(transactionHash, logIndex);

      expect(result).toEqual(expectedHash);
    });

    it('should return different hashes for different inputs', () => {
      const transactionHash1 = '0x1234';
      const logIndex1 = 1;

      const transactionHash2 = '0x5678';
      const logIndex2 = 2;

      const result1 = buildLogId(transactionHash1, logIndex1);
      const result2 = buildLogId(transactionHash2, logIndex2);

      expect(result1).not.toEqual(result2);
    });
  });
});
