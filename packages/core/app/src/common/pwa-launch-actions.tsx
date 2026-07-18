import { useCoreServices } from '@bangle.io/context';
import { toast } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
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
const IMPORT_DIALOG_ID = 'dialog::pwa-import-files';

export function PwaLaunchActions() {
  const {
    commandDispatcher,
    fileSystem,
    navigation,
    userActivityService,
    workbenchState,
    workspaceState,
  } = useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);
  const [singleSelectDialog, setSingleSelectDialog] = useAtom(
    workbenchState.$singleSelectDialog,
  );
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
  // Mirrors pendingImportFiles so the dialog's onSelect always imports the
  // full queue at selection time, even when launches merged in after the
  // picker opened.
  const pendingImportFilesRef = React.useRef(pendingImportFiles);
  pendingImportFilesRef.current = pendingImportFiles;
  const importDialogOpenRef = React.useRef(false);

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

  // Imports copy the source files; the originals are never modified. Each
  // file's write is awaited individually so a partial import produces an
  // explicit outcome: one success toast counting the imported notes,
  // navigation to the first note that actually got created, and one error
  // toast naming every file that failed (read failure, invalid name, or an
  // already-existing note — existing notes are never overwritten).
  const importMarkdownFiles = React.useCallback(
    async (wsName: string, files: PwaFileHandleLike[]) => {
      let firstImportedWsPath: string | undefined;
      const failedFileNames: string[] = [];

      for (const handle of files) {
        try {
          const file = await handle.getFile();
          const content = await file.text();
          const baseName =
            handle.name.replace(/\.(md|markdown)$/i, '').trim() ||
            'imported-note';
          const wsPath = WsPath.fromParts(wsName, `${baseName}.md`).wsPath;
          await fileSystem.createFile(
            wsPath,
            new File([content], `${baseName}.md`, { type: 'text/markdown' }),
          );
          firstImportedWsPath ??= wsPath;
        } catch {
          failedFileNames.push(handle.name);
        }
      }

      if (firstImportedWsPath) {
        toast.success(
          t.app.toasts.pwaImportSuccess({
            count: files.length - failedFileNames.length,
          }),
        );
        navigation.goWsPath(firstImportedWsPath);
      }
      if (failedFileNames.length > 0) {
        toast.error(
          t.app.toasts.pwaImportFailed({
            fileNames: failedFileNames.join(', '),
          }),
        );
      }
    },
    [fileSystem, navigation],
  );

  // The user closing the picker without choosing a workspace is the explicit
  // decision to drop the queued files. (If a different dialog replaces ours,
  // the queue survives and the picker reopens once the slot frees up.)
  React.useEffect(() => {
    if (importDialogOpenRef.current && singleSelectDialog === undefined) {
      importDialogOpenRef.current = false;
      setPendingImportFiles([]);
    } else if (
      singleSelectDialog !== undefined &&
      singleSelectDialog.dialogId !== IMPORT_DIALOG_ID
    ) {
      importDialogOpenRef.current = false;
    }
  }, [singleSelectDialog]);

  // OS file-open: ask which workspace to import the Markdown files into. The
  // queue is kept until the user selects or dismisses, so launches arriving
  // while the picker is open merge into it instead of replacing it. Waits
  // until workspaces are known; with none yet created, the files stay queued
  // and the picker appears once the first workspace exists.
  const dialogSlotFree =
    singleSelectDialog === undefined ||
    singleSelectDialog.dialogId === IMPORT_DIALOG_ID;
  React.useEffect(() => {
    if (
      pendingImportFiles.length === 0 ||
      workspaces.length === 0 ||
      !dialogSlotFree
    ) {
      return;
    }

    importDialogOpenRef.current = true;
    setSingleSelectDialog(() => ({
      dialogId: IMPORT_DIALOG_ID,
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
        importDialogOpenRef.current = false;
        const files = pendingImportFilesRef.current;
        setPendingImportFiles([]);
        void importMarkdownFiles(option.id, files);
      },
    }));
  }, [
    pendingImportFiles,
    workspaces,
    activeWsName,
    dialogSlotFree,
    importMarkdownFiles,
    setSingleSelectDialog,
  ]);

  return null;
}
