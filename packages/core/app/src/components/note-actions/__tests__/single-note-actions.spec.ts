import type { useCoreServices } from '@bangle.io/context';
import { describe, expect, it, vi } from 'vitest';
import { getSingleNoteActions } from '../single-note-actions';

type CommandDispatcher = ReturnType<
  typeof useCoreServices
>['commandDispatcher'];

describe('getSingleNoteActions', () => {
  it('returns the stable policy and dispatches an explicit canonical path', () => {
    const dispatch = vi.fn();
    const actions = getSingleNoteActions({
      commandDispatcher: { dispatch } as unknown as CommandDispatcher,
      source: 'test',
      wsPath: 'workspace:folder/note.md',
    });

    expect(actions.map(({ id }) => id)).toEqual([
      'rename-note',
      'move-note',
      'duplicate-note',
      'copy-note-path',
      'recover-note',
      'delete-note',
    ]);
    expect(
      actions.every(({ Icon, label }) => Boolean(Icon) && label.length > 0),
    ).toBe(true);
    expect(actions.at(-1)).toMatchObject({
      id: 'delete-note',
      separatorBefore: true,
      variant: 'destructive',
    });

    actions[2]?.run();
    expect(dispatch).toHaveBeenCalledWith(
      'command::ws:clone-note',
      { wsPath: 'workspace:folder/note.md' },
      'test',
    );
  });

  it.each([
    'not-a-path',
    'workspace:asset.pdf',
    ' workspace:note.md ',
  ])('rejects a non-note or non-canonical path: %s', (wsPath) => {
    expect(
      getSingleNoteActions({
        commandDispatcher: {
          dispatch: vi.fn(),
        } as unknown as CommandDispatcher,
        source: 'test',
        wsPath,
      }),
    ).toEqual([]);
  });
});
