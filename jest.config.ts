module.exports = {
  preset: 'ts-jest',
  modulePathIgnorePatterns: ['dist'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/utils/db-helpers.ts'],
};
