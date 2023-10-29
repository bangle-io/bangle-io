/** @type {import('jest').Config} */
const config = {
  testRunner: 'jest-circus/runner',
  testMatch: ['**/?(*.)+(test).ts?(x)'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },

  transformIgnorePatterns: [
    // Ignore node_modules except
    `/node_modules/(?!.pnpm)(?!(prosemirror-utils-bangle))`,
  ],
  clearMocks: true,
  setupFiles: ['<rootDir>/tooling/jest-utils/jest-setup.js'],
  setupFilesAfterEnv: [
    '<rootDir>/tooling/jest-utils/jest-setupFilesAfterEnv.js',
  ],
};
module.exports = {
  ...config,
};
