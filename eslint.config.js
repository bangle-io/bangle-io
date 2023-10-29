const configPrettier = require('eslint-config-prettier');
const js = require('@eslint/js');
const parserTypescript = require('@typescript-eslint/parser');
const pluginImport = require('eslint-plugin-import');
const pluginReact = require('eslint-plugin-react');
const pluginReactHooks = require('eslint-plugin-react-hooks');
const pluginSimpleImportSort = require('eslint-plugin-simple-import-sort');
const pluginTypescript = require('@typescript-eslint/eslint-plugin');
const ts = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ['**/*.{ts,tsx}'],
  },
  {
    languageOptions: {
      parser: parserTypescript,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        // These options are necessary for some rules to work,
        // like "import/no-default-export".
        sourceType: 'module',
        ecmaVersion: 'latest',
        project: ['tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': pluginTypescript,
      'simple-import-sort': pluginSimpleImportSort,
      'import': pluginImport,
    },
    rules: {
      ...js.configs.recommended.rules,
      // TypeScript
      ...ts.configs['recommended-requiring-type-checking'].rules,

      // Prettier
      ...configPrettier.rules,
      ...ts.configs['stylistic-type-checked'].rules,
      ...pluginImport.configs.errors.rules,

      // General import / export rules
      ...pluginImport.configs.recommended.rules,

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // The following are not necessary with TypeScript.
      'import/named': 'off',
      'import/namespace': 'off',
      'import/no-unresolved': 'off',

      // ts overrides
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
    settings: {
      ...pluginImport.configs.typescript.settings,
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    ignores: ['*.config.js'],
  },
];
