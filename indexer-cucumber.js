let common = [
  'apps/indexer/test/features/**/*.feature', // Specify our feature files
  '--require-module ts-node/register', // Load TypeScript module
  '--require apps/indexer/test/step-definitions/**/*.ts', // Load step definitions
  '--format progress-bar', // Load custom formatter
  '--format @cucumber/pretty-formatter',
].join(' ');

module.exports = { default: common };
console.log('Cucumber command:', common);
