// .eslintrc.js
module.exports = {
  plugins: ['simple-import-sort'],
  extends: [
    'react-app',
    'react-app/jest',

    // 'plugin:jest/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  overrides: [
    {
      files: '*.jsx',
    },
    {
      files: '*.tsx',
    },
    {
      files: '*.ts',
    },
    {
      files: ['tooling/**/*.spec.ts'],
      rules: {
        'jest/no-done-callback': 'off',
      },
    },
  ],
  env: {
    browser: true,
    es2020: true,
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
    Image: true,
  },

  rules: {
    'curly': 'error',
    'no-process-env': 'error',
    'import/no-cycle': [
      2,
      // eslint-disable-next-line no-process-env
      { maxDepth: 2 },
    ],
    'react-hooks/exhaustive-deps': [
      'error',
      {
        additionalHooks:
          '(useKeybindings|useSerialOperationHandler|useMyOtherCustomHook)',
      },
    ],

    'consistent-return': ['warn'],

    'jest/no-disabled-tests': 'error',
    'import/newline-after-import': ['error', { count: 1 }],
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          ['^\\u0000'],
          ['^@?(?!bangle)\\w', '^'],
          ['^@bangle\\.dev?\\w'],
          ['^@bangle\\.io?\\w'],
          ['^\\.'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
  },
  settings: {
    'jest': {
      version: '26',
    },
    'react': {
      version: '17',
    },
    'import/extensions': ['.js', '.ts', '.tsx', '.jsx'],
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.tsx', '.jsx'],
      },
    },
  },
};
