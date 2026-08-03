import { describe, expect, it } from 'vitest';
import { resolvePwaNewNoteWorkspace } from '../pwa-launch-actions';

describe('PWA new-note workspace selection', () => {
  it('uses the active workspace and ignores stale recent entries', () => {
    expect(
      resolvePwaNewNoteWorkspace({
        activeWsName: 'active',
        recentWsPaths: [{ wsPath: 'deleted:old.md' }],
        workspaces: [{ name: 'active' }, { name: 'fallback' }],
      }),
    ).toBe('active');
  });

  it('uses the first available recent workspace, then falls back safely', () => {
    expect(
      resolvePwaNewNoteWorkspace({
        activeWsName: undefined,
        recentWsPaths: [
          { wsPath: 'deleted:old.md' },
          { wsPath: 'recent:note.md' },
        ],
        workspaces: [{ name: 'fallback' }, { name: 'recent' }],
      }),
    ).toBe('recent');
    expect(
      resolvePwaNewNoteWorkspace({
        activeWsName: undefined,
        recentWsPaths: [{ wsPath: 'malformed' }, { wsPath: 'deleted:old.md' }],
        workspaces: [{ name: 'fallback' }],
      }),
    ).toBe('fallback');
  });

  it('waits for a workspace instead of dispatching a dialog without a target', () => {
    expect(
      resolvePwaNewNoteWorkspace({
        activeWsName: undefined,
        recentWsPaths: [{ wsPath: 'deleted:old.md' }],
        workspaces: [],
      }),
    ).toBeUndefined();
  });
});
