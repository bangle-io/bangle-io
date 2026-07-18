import { useCoreServices } from '@bangle.io/context';
import { toast } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue, useSetAtom } from 'jotai';
import React from 'react';
import {
  consumePwaLaunchParams,
  type PwaFileHandleLike,
  subscribePwaLaunchIntents,
} from './pwa-install';

/**
 * Acts on PWA launches that need application services: manifest shortcuts
 * (`?shortcut=`) and OS file-open launches delivered through the launch
 * queue. Deep-link hashes are applied to the URL by the pwa-install module
 * itself and handled by the hash router.
 */
export function PwaLaunchActions() {
  const {
    commandDispatcher,
    navigation,
    userActivityService,
    workbenchState,
    workspaceState,
  } = useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);
  const setSingleSelectDialog = useSetAtom(workbenchState.$singleSelectDialog);
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const recentWsPaths = useAtomValue(userActivityService.$allRecentWsPaths);
  const activeWsName = useAtomValue(navigation.$wsName);

  const [newNotePending, setNewNotePending] = React.useState(false);
  const [navigationTargetWsName, setNavigationTargetWsName] = React.useState<
    string | undefined
  >(undefined);
  const [pendingImportFiles, setPendingImportFiles] = React.useState<
    PwaFileHandleLike[]
  >([]);

  React.useEffect(() => {
    consumePwaLaunchParams(window);

    return subscribePwaLaunchIntents((intent) => {
      if (intent.shortcut === 'search') {
        setOpenOmniSearch(true);
      }
      if (intent.shortcut === 'new-note') {
        setNewNotePending(true);
      }

      const files = intent.files;
      if (files?.length) {
        setPendingImportFiles((previous) => [...previous, ...files]);
      }
    });
  }, [setOpenOmniSearch]);

  // "New note" shortcut: reuse the active workspace when there is one,
  // otherwise land in the most recently used workspace first, then open the
  // create-note dialog. With no workspaces at all the welcome page stays.
  React.useEffect(() => {
    if (!newNotePending) {
      return;
    }

    if (
      activeWsName &&
      (!navigationTargetWsName || activeWsName === navigationTargetWsName)
    ) {
      setNewNotePending(false);
      setNavigationTargetWsName(undefined);
      commandDispatcher.dispatch(
        'command::ui:create-note-dialog',
        { prefillName: undefined },
        'ui',
      );
      return;
    }

    if (navigationTargetWsName) {
      return;
    }

    const recentWsName = recentWsPaths
      .map((entry) => WsPath.safeParse(entry.wsPath).data?.wsName)
      .find((wsName) => wsName !== undefined);
    const targetWsName = recentWsName ?? workspaces[0]?.name;
    if (!targetWsName) {
      return;
    }

    setNavigationTargetWsName(targetWsName);
    navigation.goWorkspace(targetWsName);
  }, [
    newNotePending,
    activeWsName,
    navigationTargetWsName,
    recentWsPaths,
    workspaces,
    navigation,
    commandDispatcher,
  ]);

  const importMarkdownFiles = React.useCallback(
    async (wsName: string, files: PwaFileHandleLike[]) => {
      for (const [index, handle] of files.entries()) {
        try {
          const file = await handle.getFile();
          const content = await file.text();
          const baseName =
            handle.name.replace(/\.(md|markdown)$/i, '').trim() ||
            'imported-note';
          const wsPath = WsPath.fromParts(wsName, `${baseName}.md`).wsPath;
          commandDispatcher.dispatch(
            'command::ws:create-note',
            { wsPath, navigate: index === 0, content },
            'ui',
          );
        } catch {
          // Import copies the source file; a failed read or an invalid note
          // name leaves the source untouched and only skips this file.
          toast.error(t.app.toasts.pwaImportFailed({ fileName: handle.name }));
        }
      }
    },
    [commandDispatcher],
  );

  // OS file-open: ask which workspace to import the Markdown files into.
  // Waits until workspaces are known; with none yet created, the files stay
  // queued and the dialog appears once the first workspace exists.
  React.useEffect(() => {
    if (pendingImportFiles.length === 0 || workspaces.length === 0) {
      return;
    }

    const files = pendingImportFiles;
    setPendingImportFiles([]);
    setSingleSelectDialog(() => ({
      dialogId: 'dialog::pwa-import-files',
      title: t.app.dialogs.pwaImportFiles.title,
      description: t.app.dialogs.pwaImportFiles.description,
      searchPlaceholder: t.app.dialogs.pwaImportFiles.searchPlaceholder,
      groupLabel: t.app.dialogs.pwaImportFiles.groupLabel,
      emptyMessage: t.app.dialogs.pwaImportFiles.emptyMessage,
      options: workspaces.map((workspace) => ({
        id: workspace.name,
        title: workspace.name,
        active: workspace.name === activeWsName,
      })),
      onSelect: (option) => {
        void importMarkdownFiles(option.id, files);
      },
    }));
  }, [
    pendingImportFiles,
    workspaces,
    activeWsName,
    importMarkdownFiles,
    setSingleSelectDialog,
  ]);

  return null;
}
