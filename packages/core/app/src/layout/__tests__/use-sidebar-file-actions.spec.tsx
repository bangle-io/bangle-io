// @vitest-environment jsdom
import type { useCoreServices } from '@bangle.io/context';
import type { FileTreeEntry } from '@bangle.io/ui-components';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSidebarFileActions } from '../use-sidebar-file-actions';

type CommandDispatcher = ReturnType<
  typeof useCoreServices
>['commandDispatcher'];

const note: FileTreeEntry = { kind: 'file', path: 'folder/note.md' };

describe('useSidebarFileActions', () => {
  it('adapts the shared single-note policy', () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useSidebarFileActions({
        activeWsName: 'workspace',
        commandDispatcher: { dispatch } as unknown as CommandDispatcher,
      }),
    );

    const actions = result.current(note, [note]);
    expect(actions.map(({ id }) => id)).toEqual([
      'rename-note',
      'move-note',
      'duplicate-note',
      'copy-note-path',
      'recover-note',
      'delete-note',
    ]);
    expect(actions.at(-1)).toMatchObject({
      separatorBefore: true,
      variant: 'destructive',
    });

    actions
      .find(({ id }) => id === 'duplicate-note')
      ?.onClick({
        entry: note,
        selectedEntries: [note],
      });
    expect(dispatch).toHaveBeenCalledWith(
      'command::ws:clone-note',
      { wsPath: 'workspace:folder/note.md' },
      'AppSidebar.NoteActions',
    );
  });

  it('keeps multi-selection limited to bulk delete', () => {
    const dispatch = vi.fn();
    const second: FileTreeEntry = { kind: 'file', path: 'folder/second.md' };
    const { result } = renderHook(() =>
      useSidebarFileActions({
        activeWsName: 'workspace',
        commandDispatcher: { dispatch } as unknown as CommandDispatcher,
      }),
    );

    const actions = result.current(note, [note, second]);
    expect(actions.map(({ id }) => id)).toEqual(['delete-selected-files']);
    actions[0]?.onClick({ entry: note, selectedEntries: [note, second] });
    expect(dispatch).toHaveBeenCalledWith(
      'command::ui:delete-files-dialog',
      {
        wsPaths: ['workspace:folder/note.md', 'workspace:folder/second.md'],
      },
      'ui',
    );
  });
});
