import { describe, expect, it } from 'vitest';

import { removeUnusedAllDeps, removeUnusedDeps } from '../remove-unused-deps';

describe('unused dependency maintenance workers', () => {
  it('can be imported without executing the standalone script', () => {
    expect(removeUnusedDeps).toBeTypeOf('function');
    expect(removeUnusedAllDeps).toBeTypeOf('function');
  });
});
