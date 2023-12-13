let indexerAdmin = [
  'apps/indexer-admin/test/features/**/*.feature', // Specify our feature files
  '--require-module ts-node/register', // Load TypeScript module
  '--require-module tsconfig-paths/register', // Load TypeScript module
  '--require apps/indexer-admin/test/step-definitions/**/*.ts', // Load step definitions
  '--format progress-bar', // Load custom formatter
].join(' ');

let indexer = [
  'apps/indexer/test/features/**/*.feature', // Specify our feature files
  '--require-module ts-node/register', // Load TypeScript module
  '--require apps/indexer/test/step-definitions/**/*.ts', // Load step definitions
  '--format progress-bar', // Load custom formatter
].join(' ');

module.exports = { default: indexer, admin: indexerAdmin };
