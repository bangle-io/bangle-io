// .eslintrc.js
module.exports = {
  extends: [
    'react-app',
    'react-app/jest',

    /*'plugin:import/errors', 'plugin:import/warnings'*/
  ],
  env: {
    jest: true,
  },
  globals: {
    page: true,
    browser: true,
    context: true,
    jestPuppeteer: true,
    Node: 'off',
    Selection: 'off',
    Plugin: 'off',
    Image: 'off',
  },
  rules: {
    'curly': 'error',
    'no-process-env': 'error',
    // 'react/prop-types': ['error'],
    // 'import/no-unused-modules': [1, { unusedExports: true }],
  },
  settings: {
    jest: {
      version: '26',
    },
    react: {
      version: '16',
    },
  },
};
