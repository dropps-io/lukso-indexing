module.exports = {
  preset: 'ts-jest',
  modulePathIgnorePatterns: ['dist'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/utils/db-helpers.ts'],
  roots: ['<rootDir>/apps/', '<rootDir>/libs/', '<rootDir>/test/'],
  moduleNameMapper: {
    '^@db/lukso-data(|/.*)$': '<rootDir>/libs/database/lukso-data/$1',
    '^@db/lukso-structure(|/.*)$': '<rootDir>/libs/database/lukso-structure/$1',
    '^@db/utils(|/.*)$': '<rootDir>/libs/database/utils/$1',
    '^@libs/logger(|/.*)$': '<rootDir>/libs/logger/$1',
    '^@utils(|/.*)$': '<rootDir>/shared/utils/$1',
    '^@models(|/.*)$': '<rootDir>/shared/models/$1',
    '^@decorators(|/.*)$': '<rootDir>/shared/decorators/$1',
  },
};
