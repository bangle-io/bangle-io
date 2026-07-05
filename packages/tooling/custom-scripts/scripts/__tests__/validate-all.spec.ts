import { describe, expect, it } from 'vitest';

import {
  findStarExportLines,
  isWorkspaceImplementationImport,
  isWorkspaceImportContractFile,
} from '../validate-all';

describe('isWorkspaceImplementationImport', () => {
  const packageNames = new Set([
    '@bangle.io/ws-path',
    '@bangle.io/service-core',
  ]);

  it('rejects src implementation imports for known workspace packages', () => {
    expect(
      isWorkspaceImplementationImport(
        '@bangle.io/ws-path/src/ws-path',
        packageNames,
      ),
    ).toBe(true);
  });

  it('allows package roots and explicit public subpaths', () => {
    expect(
      isWorkspaceImplementationImport('@bangle.io/ws-path', packageNames),
    ).toBe(false);
    expect(
      isWorkspaceImplementationImport(
        '@bangle.io/service-core/testing',
        packageNames,
      ),
    ).toBe(false);
  });

  it('ignores external packages that happen to contain src', () => {
    expect(
      isWorkspaceImplementationImport('@external/pkg/src/index', packageNames),
    ).toBe(false);
  });
});

describe('isWorkspaceImportContractFile', () => {
  it('includes TypeScript, JavaScript, and Node module variants', () => {
    expect(isWorkspaceImportContractFile('package/src/index.ts')).toBe(true);
    expect(isWorkspaceImportContractFile('package/src/index.tsx')).toBe(true);
    expect(isWorkspaceImportContractFile('package/scripts/setup.js')).toBe(
      true,
    );
    expect(isWorkspaceImportContractFile('package/scripts/setup.jsx')).toBe(
      true,
    );
    expect(isWorkspaceImportContractFile('package/scripts/setup.mjs')).toBe(
      true,
    );
    expect(isWorkspaceImportContractFile('package/scripts/setup.cjs')).toBe(
      true,
    );
  });

  it('ignores non-source text files', () => {
    expect(isWorkspaceImportContractFile('package/README.md')).toBe(false);
    expect(isWorkspaceImportContractFile('package/styles.css')).toBe(false);
  });
});

describe('findStarExportLines', () => {
  it('finds star re-exports with line numbers', () => {
    expect(
      findStarExportLines(`
export { named } from './named';
export * from './private-module';
  export * from "./other-private-module";
export type { PublicType } from './types';
`),
    ).toEqual([3, 4]);
  });

  it('ignores non-star exports', () => {
    expect(
      findStarExportLines(`
export { A, B } from './named';
export type { C } from './types';
export * as namespace from './namespace';
`),
    ).toEqual([]);
  });
});
