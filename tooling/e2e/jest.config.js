// jest.config.js

module.exports = {
  preset: 'jest-puppeteer',
  testRunner: 'jest-circus/runner',
  modulePaths: ['<rootDir>'],
  setupFiles: ['<rootDir>/../_scripts/jest-setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((@popperjs)|(@bangle.dev)|(debounce-fn))/)',
  ],
  testMatch: [
    // '**/__integration_tests__/**/?(*.)+(spec|test).[jt]s?(x)',
    '<rootDir>/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};
