import { describe, expect, it } from 'vitest';

import {
  findUnmarkedPublicEntryExports,
  isWorkspaceImplementationImport,
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

describe('findUnmarkedPublicEntryExports', () => {
  it('accepts public-marked entry exports', () => {
    expect(
      findUnmarkedPublicEntryExports(`
        /** @public */
        export * from './ws-path';

        /**
         * Root package contract.
         * @public
         */
        export type { WsPath } from './ws-path';
      `),
    ).toEqual([]);
  });

  it('reports entry exports without public markers', () => {
    expect(
      findUnmarkedPublicEntryExports(`
        export * from './ws-path';

        /** @public */
        export { WsPath } from './ws-path';

        export const testOnlyHelper = true;
      `),
    ).toEqual([2, 7]);
  });
});
