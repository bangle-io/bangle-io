// jest.config.js

module.exports = {
  preset: 'jest-puppeteer',
  modulePaths: ['<rootDir>'],
  testMatch: [
    // '**/__integration_tests__/**/?(*.)+(spec|test).[jt]s?(x)',
    '<rootDir>/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};
