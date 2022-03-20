// .eslintrc.js
module.exports = {
  root: true,
  plugins: ['simple-import-sort', 'sort-class-members'],
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
      files: ['**/*.ts?(x)'],
      rules: {
        '@typescript-eslint/array-type': [
          'error',
          {
            default: 'array-simple',
          },
        ],
        '@typescript-eslint/explicit-member-accessibility': [
          'error',
          {
            accessibility: 'no-public',
            overrides: {
              parameterProperties: 'off',
            },
          },
        ],
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          {
            assertionStyle: 'as',
          },
        ],
        '@typescript-eslint/ban-types': [
          'error',
          {
            types: {
              Object: "Use {} or 'object' instead.",
              String: "Use 'string' instead.",
              Number: "Use 'number' instead.",
              Boolean: "Use 'boolean' instead.",
              Function: 'Avoid the Function type',
            },
            extendDefaults: false,
          },
        ],

        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'class',
            format: ['PascalCase'],
          },
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^I[A-Z]',
              match: false,
            },
          },
        ],
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
          '(useKeybindings|useSerialOperationHandler|useInterval|useMyOtherCustomHook)',
      },
    ],
    'testing-library/no-container': ['warn'],
    'testing-library/no-node-access': ['warn'],
    'testing-library/no-render-in-setup': ['warn'],
    'testing-library/no-unnecessary-act': ['warn'],
    'testing-library/no-wait-for-side-effects': ['warn'],
    'testing-library/prefer-screen-queries': ['warn'],
    'testing-library/render-result-naming-convention': ['warn'],

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

    'sort-class-members/sort-class-members': [
      2,
      {
        order: [
          '[static-properties]',
          '[static-methods]',
          '[properties]',
          '[conventional-private-properties]',
          'constructor',
          '[accessor-pairs]',
          '[accessors]',
          '[methods]',
          '[conventional-private-methods]',
        ],
        accessorPairPositioning: 'getThenSet',
        groups: {
          'accessor-pairs': [{ accessorPair: true, sort: 'alphabetical' }],
          'accessors': [
            { kind: 'get', accessorPair: false, sort: 'alphabetical' },
            { kind: 'set', accessorPair: false, sort: 'alphabetical' },
          ],

          'methods': [{ type: 'method', sort: 'alphabetical' }],
          'static-methods': [
            { type: 'method', sort: 'alphabetical', static: true },
          ],
          'static-properties': [
            { type: 'property', sort: 'alphabetical', static: true },
          ],
        },
      },
    ],

    'no-multiple-empty-lines': ['error'],

    'padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: '*',
        next: 'return',
      },
    ],

    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
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
