import { describe, expect, it } from 'vitest';

import { addWorkspaceDep } from '../add-workspace-dep';

describe('addWorkspaceDep', () => {
  it('can be imported as a reusable maintenance worker', () => {
    expect(addWorkspaceDep).toBeTypeOf('function');
  });
});
