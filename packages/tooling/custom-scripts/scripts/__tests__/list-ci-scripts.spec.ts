import { describe, expect, it } from 'vitest';

import { listCiScripts } from '../list-ci-scripts';

describe('list-ci-scripts', () => {
  it('returns root CI scripts in reverse alphabetical order', () => {
    expect(
      listCiScripts({
        scripts: {
          build: 'vite build',
          'e2e:ci': 'playwright test',
          'lint:ci': 'biome ci .',
          'test:ci': 'vitest run',
        },
      }),
    ).toEqual(['test:ci', 'lint:ci', 'e2e:ci']);
  });

  it.each([
    {},
    { scripts: null },
    { scripts: [] },
  ])('rejects an invalid scripts field', (packageJson) => {
    expect(() => listCiScripts(packageJson)).toThrow(
      'package.json must define a scripts object.',
    );
  });

  it('rejects a package without CI scripts', () => {
    expect(() => listCiScripts({ scripts: { build: 'vite build' } })).toThrow(
      'package.json does not define any scripts ending in :ci.',
    );
  });
});
