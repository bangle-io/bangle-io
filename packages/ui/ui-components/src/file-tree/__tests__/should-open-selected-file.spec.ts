import { describe, expect, it } from 'vitest';
import { shouldOpenSelectedFile } from '../types';

describe('shouldOpenSelectedFile', () => {
  it('opens when the user selects a file different from the active route', () => {
    expect(
      shouldOpenSelectedFile({
        selectedPath: 'notes/b.md',
        activeRoutePath: 'notes/a.md',
        isKnownFilePath: true,
      }),
    ).toBe(true);
  });

  it('opens when nothing is active yet', () => {
    expect(
      shouldOpenSelectedFile({
        selectedPath: 'notes/a.md',
        activeRoutePath: null,
        isKnownFilePath: true,
      }),
    ).toBe(true);
  });

  // This is the regression guard: browser back/forward (and any external
  // navigation) re-selects the active file, and re-opening it would push a
  // duplicate history entry that destroys the forward stack.
  it('does NOT open when the selection already matches the active route', () => {
    expect(
      shouldOpenSelectedFile({
        selectedPath: 'notes/a.md',
        activeRoutePath: 'notes/a.md',
        isKnownFilePath: true,
      }),
    ).toBe(false);
  });

  it('does not open an unknown (non-tree) path', () => {
    expect(
      shouldOpenSelectedFile({
        selectedPath: 'notes/ghost.md',
        activeRoutePath: 'notes/a.md',
        isKnownFilePath: false,
      }),
    ).toBe(false);
  });

  it('does not open when there is no selected path', () => {
    expect(
      shouldOpenSelectedFile({
        selectedPath: undefined,
        activeRoutePath: 'notes/a.md',
        isKnownFilePath: true,
      }),
    ).toBe(false);

    expect(
      shouldOpenSelectedFile({
        selectedPath: '',
        activeRoutePath: null,
        isKnownFilePath: true,
      }),
    ).toBe(false);
  });
});
