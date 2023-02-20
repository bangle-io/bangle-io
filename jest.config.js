const config = {
  testRunner: 'jest-circus/runner',
  testPathIgnorePatterns: [
    `<rootDir>/.yarn`,
    `<rootDir>/tooling/playwright-e2e`,
  ],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  transformIgnorePatterns: [],
  coveragePathIgnorePatterns: [`<rootDir>/.yarn`],
  // collectCoverage: true,
  clearMocks: true,
  setupFiles: ['<rootDir>/tooling/_scripts/jest-setup.js'],
  setupFilesAfterEnv: [
    '<rootDir>/tooling/_scripts/jest-setupFilesAfterEnv.js',
    '@bangle.dev/jest-utils',
  ],
  globalSetup: '<rootDir>/tooling/_scripts/jest-global-setup.js',
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/tooling/_scripts/fileMock.js',
    '\\.(css)$': '<rootDir>/tooling/_scripts/styleMock.js',
  },
};
module.exports = {
  projects: [
    {
      displayName: 'regular',
      testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
      ...config,
    },
    {
      displayName: 'network',
      testMatch: ['**/?(*.)+(network-test).[jt]s?(x)'],
      ...config,
    },
  ],
};
