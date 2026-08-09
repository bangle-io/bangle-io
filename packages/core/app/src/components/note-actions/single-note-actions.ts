import type { useCoreServices } from '@bangle.io/context';
import { WsPath } from '@bangle.io/ws-path';
import {
  CopyPlus,
  FolderInput,
  History,
  Link,
  Pencil,
  Trash2,
} from 'lucide-react';
import type React from 'react';

type CommandDispatcher = ReturnType<
  typeof useCoreServices
>['commandDispatcher'];

type SingleNoteActionId =
  | 'rename-note'
  | 'move-note'
  | 'duplicate-note'
  | 'copy-note-path'
  | 'recover-note'
  | 'delete-note';

export interface SingleNoteAction {
  id: SingleNoteActionId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  variant?: 'destructive';
  separatorBefore?: boolean;
  run: () => void;
}

/**
 * The canonical single-note action policy shared by app-owned note surfaces.
 * Invalid, non-note, and non-canonical paths intentionally have no actions.
 */
export function getSingleNoteActions({
  commandDispatcher,
  source,
  wsPath,
}: {
  commandDispatcher: CommandDispatcher;
  source: string;
  wsPath: string;
}): readonly SingleNoteAction[] {
  const notePath = WsPath.safeParseFile(wsPath).data;
  if (!notePath?.isNote() || notePath.wsPath !== wsPath) {
    return [];
  }

  const dispatch = (
    id:
      | 'command::ui:rename-note-dialog'
      | 'command::ui:move-note-dialog'
      | 'command::ws:clone-note'
      | 'command::ui:copy-workspace-path'
      | 'command::ui:recover-note'
      | 'command::ui:delete-note-dialog',
  ) => {
    commandDispatcher.dispatch(id, { wsPath: notePath.wsPath }, source);
  };

  return [
    {
      id: 'rename-note',
      label: t.app.components.noteActions.rename,
      Icon: Pencil,
      run: () => dispatch('command::ui:rename-note-dialog'),
    },
    {
      id: 'move-note',
      label: t.app.components.noteActions.move,
      Icon: FolderInput,
      run: () => dispatch('command::ui:move-note-dialog'),
    },
    {
      id: 'duplicate-note',
      label: t.app.components.noteActions.duplicate,
      Icon: CopyPlus,
      run: () => dispatch('command::ws:clone-note'),
    },
    {
      id: 'copy-note-path',
      label: t.app.components.noteActions.copyPath,
      Icon: Link,
      run: () => dispatch('command::ui:copy-workspace-path'),
    },
    {
      id: 'recover-note',
      label: t.app.components.noteActions.recover,
      Icon: History,
      run: () => dispatch('command::ui:recover-note'),
    },
    {
      id: 'delete-note',
      label: t.app.components.noteActions.delete,
      Icon: Trash2,
      variant: 'destructive',
      separatorBefore: true,
      run: () => dispatch('command::ui:delete-note-dialog'),
    },
  ];
}
