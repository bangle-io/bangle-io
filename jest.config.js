/** @type {import('jest').Config} */
const config = {
  testRunner: 'jest-circus/runner',
  testMatch: ['**/?(*.)+(test).ts?(x)'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },

  transformIgnorePatterns: [
    // Ignore node_modules except
    `/node_modules/(?!.pnpm)(?!(prosemirror-utils-bangle|superjson))`,
  ],
  clearMocks: true,
  setupFiles: ['<rootDir>/packages/tooling/jest-utils/jest-setup.js'],
  setupFilesAfterEnv: [
    '<rootDir>/packages/tooling/jest-utils/jest-setupFilesAfterEnv.js',
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/packages/tooling/jest-utils/fileMock.js',
    '\\.(css)$': '<rootDir>/packages/tooling/jest-utils/styleMock.js',
  },
};

module.exports = {
  ...config,
};
