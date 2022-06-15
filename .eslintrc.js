// .eslintrc.js
module.exports = {
  root: true,
  plugins: ['simple-import-sort', 'sort-class-members'],
  extends: [
    'react-app',
    'react-app/jest',
    'plugin:storybook/recommended',

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
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      rules: {
        '@typescript-eslint/array-type': [
          'error',
          {
            default: 'array-simple',
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
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          {
            assertionStyle: 'as',
            objectLiteralTypeAssertions: 'allow-as-parameter',
          },
        ],
        '@typescript-eslint/consistent-type-exports': [
          'warn',
          {
            fixMixedExportsWithInlineTypeSpecifier: true,
          },
        ],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            disallowTypeAnnotations: false,
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
        '@typescript-eslint/method-signature-style': 'error',
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'class',
            format: ['PascalCase'],
          },
          {
            selector: 'memberLike',
            modifiers: ['private'],
            format: ['camelCase'],
            leadingUnderscore: 'require',
          },
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^I[A-Z]',
              match: false,
            },
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
        ],
        '@typescript-eslint/no-base-to-string': 'error',
        '@typescript-eslint/no-duplicate-imports': 'error',
        '@typescript-eslint/no-extraneous-class': 'error',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        // '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/no-unnecessary-type-arguments': 'error',
        '@typescript-eslint/prefer-literal-enum-member': 'error',
        '@typescript-eslint/prefer-reduce-type-parameter': 'error',
        '@typescript-eslint/prefer-ts-expect-error': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
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
    'testing-library/no-container': ['off'],
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
          'conventional-private-properties': [
            { type: 'property', sort: 'alphabetical', name: '/_.+/' },
          ],
          'conventional-private-methods': [
            { type: 'method', sort: 'alphabetical', name: '/_.+/' },
          ],
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

      { blankLine: 'always', prev: '*', next: 'if' },
      { blankLine: 'any', prev: 'block-like', next: 'if' },
    ],

    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
  },
  settings: {
    'jest': {
      version: '28',
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
