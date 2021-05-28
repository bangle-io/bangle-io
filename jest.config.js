module.exports = {
  testPathIgnorePatterns: [`<rootDir>/.yarn`, `<rootDir>/e2e`],
  transformIgnorePatterns: [],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coveragePathIgnorePatterns: [`<rootDir>/.yarn`],
  // collectCoverage: true,
  clearMocks: true,
  setupFiles: ['<rootDir>/_scripts/jest-setup.js'],
  globalSetup: '<rootDir>/_scripts/jest-global-setup.js',
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/_scripts/fileMock.js',
    '\\.(css)$': '<rootDir>/_scripts/styleMock.js',
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
};
