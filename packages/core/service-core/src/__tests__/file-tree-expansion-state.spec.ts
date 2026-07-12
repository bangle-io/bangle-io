import { describe, expect, it } from 'vitest';
import { reduceFileTreeExpansion } from '../file-tree-expansion-state';

describe('reduceFileTreeExpansion', () => {
  it('records directory expansion without disturbing other workspaces', () => {
    const state = { alpha: ['docs'], beta: ['archive'] };

    expect(
      reduceFileTreeExpansion(state, {
        type: 'set-directory',
        workspaceName: 'alpha',
        path: 'src',
        expanded: true,
      }),
    ).toEqual({ alpha: ['docs', 'src'], beta: ['archive'] });
  });

  it('removes the collapsed directory and its hidden expanded descendants', () => {
    const state = { alpha: ['docs', 'docs/deep', 'src'] };

    expect(
      reduceFileTreeExpansion(state, {
        type: 'set-directory',
        workspaceName: 'alpha',
        path: 'docs',
        expanded: false,
      }),
    ).toEqual({ alpha: ['src'] });
  });

  it('reveals paths by union without collapsing user-expanded branches', () => {
    const state = { alpha: ['muddied'] };

    expect(
      reduceFileTreeExpansion(state, {
        type: 'reveal',
        workspaceName: 'alpha',
        paths: ['active', 'active/deep'],
      }),
    ).toEqual({ alpha: ['muddied', 'active', 'active/deep'] });
  });

  it('collapse-all replaces only the target workspace state', () => {
    const state = { alpha: ['muddied'], beta: ['archive'] };

    expect(
      reduceFileTreeExpansion(state, {
        type: 'collapse-all',
        workspaceName: 'alpha',
        keepExpandedPaths: ['active', 'active/deep'],
      }),
    ).toEqual({
      alpha: ['active', 'active/deep'],
      beta: ['archive'],
    });
  });

  it('preserves identity for no-op transitions', () => {
    const state = { alpha: ['docs'] };

    expect(
      reduceFileTreeExpansion(state, {
        type: 'reveal',
        workspaceName: 'alpha',
        paths: ['docs'],
      }),
    ).toBe(state);
  });
});
