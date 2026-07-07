import type { useCoreServices } from '@bangle.io/context';
import type {
  FileTreeEntry,
  FileTreeEntryAction,
} from '@bangle.io/ui-components';
import { WsDirPath, WsPath } from '@bangle.io/ws-path';
import {
  Copy,
  ExternalLink,
  FolderPlus,
  Move,
  Pencil,
  PlusIcon,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';

/**
 * Builds the context-menu actions for sidebar file-tree entries. Extracted
 * from AppSidebar so the sidebar component stays a thin composition layer;
 * every action dispatches a command and carries no state of its own.
 */
type CommandDispatcher = ReturnType<
  typeof useCoreServices
>['commandDispatcher'];

export function useSidebarFileActions({
  activeWsName,
  commandDispatcher,
}: {
  activeWsName: string | undefined;
  commandDispatcher: CommandDispatcher;
}) {
  return useMemo(
    () =>
      (
        entry: FileTreeEntry,
        selectedEntries: readonly FileTreeEntry[],
      ): FileTreeEntryAction[] => {
        const actions: FileTreeEntryAction[] = [];
        const getFileWsPath = (relativePath: string) =>
          activeWsName
            ? WsPath.fromParts(activeWsName, relativePath).wsPath
            : undefined;
        const getDirWsPath = (relativePath: string) =>
          activeWsName
            ? WsDirPath.fromParts(activeWsName, relativePath).wsPath
            : undefined;

        if (entry.kind === 'directory') {
          const dirWsPath = getDirWsPath(entry.path);

          actions.push({
            id: 'new-note-here',
            label: t.app.components.appSidebar.newNoteHereActionTitle,
            Icon: PlusIcon,
            onClick: ({ entry }) => {
              commandDispatcher.dispatch(
                'command::ws:quick-new-note',
                {
                  pathPrefix: entry.path,
                },
                'ui',
              );
            },
          });

          actions.push({
            id: 'new-folder-here',
            label: t.app.components.appSidebar.newFolderHereActionTitle,
            Icon: FolderPlus,
            onClick: ({ entry }) => {
              commandDispatcher.dispatch(
                'command::ui:create-directory-dialog',
                {
                  pathPrefix: entry.path,
                },
                'ui',
              );
            },
          });

          if (dirWsPath) {
            actions.push({
              id: 'rename-folder',
              label: t.app.components.appSidebar.renameActionTitle,
              Icon: Pencil,
              onClick: () => {
                commandDispatcher.dispatch(
                  'command::ui:rename-directory-dialog',
                  { dirWsPath },
                  'ui',
                );
              },
            });

            actions.push({
              id: 'delete-folder',
              label: t.app.components.appSidebar.deleteActionTitle,
              Icon: Trash2,
              variant: 'destructive' as const,
              onClick: () => {
                commandDispatcher.dispatch(
                  'command::ui:delete-directory-dialog',
                  { dirWsPath },
                  'ui',
                );
              },
            });
          }

          return actions;
        }

        const wsPath = getFileWsPath(entry.path);
        const filePath = wsPath ? WsPath.safeParseFile(wsPath).data : undefined;
        const selectedFileWsPaths = [
          ...new Set(
            selectedEntries
              .filter((selectedEntry) => selectedEntry.kind === 'file')
              .map((selectedEntry) => getFileWsPath(selectedEntry.path))
              .filter((selectedWsPath): selectedWsPath is string =>
                Boolean(selectedWsPath),
              ),
          ),
        ];
        const pushDeleteSelectedFilesAction = () => {
          actions.push({
            id: 'delete-selected-files',
            label: t.app.components.appSidebar.deleteSelectedFilesActionTitle({
              count: selectedFileWsPaths.length,
            }),
            Icon: Trash2,
            variant: 'destructive' as const,
            onClick: () => {
              commandDispatcher.dispatch(
                'command::ui:delete-files-dialog',
                { wsPaths: selectedFileWsPaths },
                'ui',
              );
            },
          });
        };

        if (filePath) {
          actions.push({
            id: 'copy-path',
            label: t.app.components.appSidebar.copyPathActionTitle,
            Icon: Copy,
            onClick: ({ entry }) => {
              const wsPath = getFileWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:copy-workspace-path',
                { wsPath },
                'ui',
              );
            },
          });
        }

        if (filePath && !filePath.isNote()) {
          actions.push({
            id: 'open',
            label: t.app.components.appSidebar.openActionTitle,
            Icon: ExternalLink,
            onClick: ({ entry }) => {
              const wsPath = getFileWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ws:go-ws-path',
                { wsPath },
                'ui',
              );
            },
          });

          actions.push({
            id: 'rename-file',
            label: t.app.components.appSidebar.renameActionTitle,
            Icon: Pencil,
            onClick: ({ entry }) => {
              const wsPath = getFileWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:rename-file-dialog',
                { wsPath },
                'ui',
              );
            },
          });

          if (selectedFileWsPaths.length > 1) {
            pushDeleteSelectedFilesAction();

            return actions;
          }

          actions.push({
            id: 'delete-file',
            label: t.app.components.appSidebar.deleteActionTitle,
            Icon: Trash2,
            variant: 'destructive' as const,
            onClick: ({ entry }) => {
              const wsPath = getFileWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:delete-file-dialog',
                { wsPath },
                'ui',
              );
            },
          });

          return actions;
        }

        if (filePath?.isNote()) {
          if (selectedFileWsPaths.length > 1) {
            pushDeleteSelectedFilesAction();

            return actions;
          }

          actions.push({
            id: 'rename',
            label: t.app.components.appSidebar.renameActionTitle,
            Icon: Pencil,
            onClick: ({ entry }) => {
              const wsPath = getFileWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:rename-note-dialog',
                { wsPath },
                'ui',
              );
            },
          });

          actions.push({
            id: 'move',
            label: t.app.components.appSidebar.moveActionTitle,
            Icon: Move,
            onClick: ({ entry }) => {
              const wsPath = getFileWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:move-note-dialog',
                { wsPath },
                'ui',
              );
            },
          });

          actions.push({
            id: 'delete',
            label: t.app.components.appSidebar.deleteActionTitle,
            Icon: Trash2,
            variant: 'destructive' as const,
            onClick: ({ entry }) => {
              const wsPath = getFileWsPath(entry.path);
              if (!wsPath) {
                return;
              }
              commandDispatcher.dispatch(
                'command::ui:delete-note-dialog',
                { wsPath },
                'ui',
              );
            },
          });
        }

        return actions;
      },
    [activeWsName, commandDispatcher],
  );
}
