// packages/core/command-handlers/src/ws-command-handlers.ts
import {
  getAppErrorCause,
  isAppError,
  throwAppError,
} from '@bangle.io/base-utils';
import { EDITOR_SAVE_DRAIN_TIMEOUT_MS } from '@bangle.io/constants';
import { waitForSaveQueueToDrain } from '@bangle.io/service-core';
import { toast } from '@bangle.io/ui-components';
import { WsDirPath, WsPath } from '@bangle.io/ws-path';
import { c, getCtx } from './helper';

import { validateInputPath } from './utils';

function assertDirectoryWsPath(wsPath: string, errorPath = wsPath): WsDirPath {
  const dirPath = WsPath.fromString(wsPath).asDir();

  if (!dirPath || dirPath.isRoot) {
    throwAppError(
      'error::ws-path:invalid-ws-path',
      t.app.errors.wsPath.invalidDirectoryPath,
      {
        invalidPath: errorPath,
      },
    );
  }

  return dirPath;
}

function isUnderDirectory(filePath: WsPath, dirPath: WsDirPath): boolean {
  return (
    filePath.wsName === dirPath.wsName && filePath.path.startsWith(dirPath.path)
  );
}

function basename(path: string): string {
  return path.replace(/\/+$/, '').split('/').at(-1) || path;
}

function normalizeDestinationDirWsPath(destDirWsPath: string): string {
  const separatorIndex = destDirWsPath.indexOf(':');
  if (separatorIndex < 0) {
    return destDirWsPath;
  }

  const wsName = destDirWsPath.slice(0, separatorIndex);
  const path = destDirWsPath.slice(separatorIndex + 1).replace(/^\/+/, '');
  return path ? WsDirPath.fromParts(wsName, path).wsPath : `${wsName}:`;
}

function rethrowRelocationError(
  error: unknown,
  newWsPath: string,
  fileName: string,
  fallbackMessage: string,
): never {
  if (isAppError(error)) {
    if (getAppErrorCause(error)?.name === 'error::file:already-existing') {
      throwAppError(
        'error::file:already-existing',
        t.app.errors.file.alreadyExistsInDest({ fileName }),
        { wsPath: newWsPath },
      );
    }
    throw error;
  }

  toast.error(fallbackMessage);
  throw error;
}

async function assertSourceSavesDrained(
  editorEngine: {
    hasPendingOrFailedSave: (wsPath?: string) => boolean;
    subscribeToSaveStatus: (
      listener: () => void,
      wsPath?: string,
    ) => () => void;
  },
  relocations: readonly { oldWsPath: string; newWsPath: string }[],
  operation: 'move' | 'rename',
): Promise<void> {
  const drainResults = await Promise.all(
    relocations.map(({ oldWsPath }) =>
      waitForSaveQueueToDrain(
        editorEngine,
        EDITOR_SAVE_DRAIN_TIMEOUT_MS,
        oldWsPath,
      ),
    ),
  );
  const blockedIndex = drainResults.findIndex((drained) => !drained);
  const blockedRelocation = relocations[blockedIndex];
  if (blockedRelocation) {
    throwAppError(
      'error::file:invalid-operation',
      t.app.errors.file.relocationBlockedByUnsavedChanges,
      { operation, ...blockedRelocation },
    );
  }
}

export const wsCommandHandlers = [
  c('command::ws:new-note-from-input', ({ navigation }, { inputPath }, key) => {
    const { dispatch } = getCtx(key);
    validateInputPath(inputPath);

    const { wsName } = navigation.resolveAtoms();

    if (!wsName) {
      throwAppError(
        'error::workspace:not-opened',
        t.app.errors.workspace.notOpened,
        {
          wsPath: inputPath,
        },
      );
    }

    // Add .md extension if not present
    if (!inputPath.endsWith(WsPath.DEFAULT_NOTE_EXTENSION)) {
      inputPath = inputPath + WsPath.DEFAULT_NOTE_EXTENSION;
    }
    const wsPath = WsPath.fromParts(wsName, inputPath).toString();

    dispatch('command::ws:create-note', { wsPath, navigate: true });
  }),

  c(
    'command::ws:create-note',
    async ({ fileSystem, navigation }, { wsPath, navigate }) => {
      const parsedPath = WsPath.fromString(wsPath);
      const wsName = parsedPath.wsName;

      if (!wsName) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.notOpened,
          {
            wsPath,
          },
        );
      }

      const filePath = WsPath.assertFile(wsPath);
      const fileNameWithoutExt = filePath.fileNameWithoutExtension;

      try {
        await fileSystem.createFile(
          wsPath,
          new File([''], fileNameWithoutExt, {
            type: 'text/plain',
          }),
        );
        toast.success(
          t.app.toasts.fileCreated({ fileName: filePath.fileName }),
        );
      } catch (error) {
        toast.error(t.app.toasts.fileCreateFailed);
        throw error;
      }

      if (navigate) {
        navigation.goWsPath(wsPath);
      }
    },
  ),

  c('command::ws:go-workspace', ({ navigation }, { wsName }) => {
    navigation.goWorkspace(wsName);
  }),
  c('command::ws:go-ws-path', ({ navigation }, { wsPath }) => {
    navigation.goWsFile(wsPath);
  }),

  c(
    'command::ws:delete-workspace',
    async ({ workspaceOps, navigation }, { wsName }) => {
      await workspaceOps.deleteWorkspaceInfo(wsName);

      if (navigation.resolveAtoms().wsName === wsName) {
        navigation.goHome();
      }
    },
  ),

  c('command::ws:delete-ws-path', async ({ fileSystem }, { wsPath }) => {
    const filePath = WsPath.assertFile(wsPath);

    try {
      await fileSystem.deleteFile(wsPath);
      toast.success(t.app.toasts.fileDeleted({ fileName: filePath.fileName }));
    } catch (error) {
      toast.error(t.app.toasts.fileDeleteFailed);
      throw error;
    }
  }),

  c('command::ws:delete-ws-paths', async ({ fileSystem }, { wsPaths }) => {
    const uniqueWsPaths = [...new Set(wsPaths)];

    if (uniqueWsPaths.length === 0) {
      throwAppError(
        'error::file:invalid-note-path',
        t.app.errors.file.invalidNotePath,
        {
          invalidWsPath: '',
        },
      );
    }

    try {
      await fileSystem.deleteFiles(uniqueWsPaths);
      toast.success(t.app.toasts.filesDeleted({ count: uniqueWsPaths.length }));
    } catch (error) {
      toast.error(t.app.toasts.filesDeleteFailed);
      throw error;
    }
  }),

  c(
    'command::ws:rename-ws-path',
    async (
      { editorEngine, fileSystem, userActivityService },
      { wsPath, newWsPath },
    ) => {
      const oldPath = WsPath.fromString(wsPath);
      const newPath = WsPath.fromString(newWsPath);

      if (!oldPath.wsName) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.notOpened,
          {
            wsPath,
          },
        );
      }

      if (oldPath.wsName !== newPath.wsName) {
        throwAppError(
          'error::file:invalid-operation',
          t.app.errors.file.cannotRenameToDifferentWorkspace,
          {
            operation: 'rename',
            oldWsPath: wsPath,
            newWsPath,
          },
        );
      }

      const newFilePath = WsPath.assertFile(newWsPath);
      if (wsPath === newWsPath) {
        return;
      }

      await assertSourceSavesDrained(
        editorEngine,
        [{ oldWsPath: wsPath, newWsPath }],
        'rename',
      );

      // Keep the open note visible while the storage write is in flight.
      // WorkspaceState follows the durable rename event once it lands.
      try {
        await fileSystem.renameFile({
          oldWsPath: wsPath,
          newWsPath,
        });
      } catch (error) {
        rethrowRelocationError(
          error,
          newWsPath,
          newFilePath.fileName,
          t.app.toasts.fileRenameFailed,
        );
      }

      const starResult = await userActivityService.relocateStarredItem(
        oldPath,
        newPath,
      );
      if (starResult === 'failed') {
        toast.warning(
          t.app.toasts.fileRenameStarUpdateFailed({
            fileName: newFilePath.fileName,
          }),
        );
      } else {
        toast.success(
          t.app.toasts.fileRenamed({ fileName: newFilePath.fileName }),
        );
      }
    },
  ),

  c(
    'command::ws:move-ws-path',
    async (
      { editorEngine, fileSystem, userActivityService },
      { wsPath, destDirWsPath },
    ) => {
      const filePath = WsPath.assertFile(wsPath);
      const destDir = WsPath.fromString(
        normalizeDestinationDirWsPath(destDirWsPath),
      ).asDir();
      if (!destDir) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.notOpened,
          {
            wsPath,
          },
        );
      }

      const newWsPath = WsPath.fromParts(
        destDir.wsName,
        WsPath.pathJoin(destDir.isRoot ? '' : destDir.path, filePath.fileName),
      ).wsPath;

      if (wsPath === newWsPath) {
        return;
      }

      await assertSourceSavesDrained(
        editorEngine,
        [{ oldWsPath: wsPath, newWsPath }],
        'move',
      );

      // Keep the open note visible while the storage write is in flight.
      // WorkspaceState follows the durable rename event once it lands.
      try {
        await fileSystem.renameFile({
          oldWsPath: wsPath,
          newWsPath,
        });
      } catch (error) {
        rethrowRelocationError(
          error,
          newWsPath,
          filePath.fileName,
          t.app.toasts.fileMoveFailed,
        );
      }

      const starResult = await userActivityService.relocateStarredItem(
        filePath,
        WsPath.fromString(newWsPath),
      );
      if (starResult === 'failed') {
        toast.warning(
          t.app.toasts.fileMoveStarUpdateFailed({
            fileName: filePath.fileName,
          }),
        );
      } else {
        toast.success(t.app.toasts.fileMoved({ fileName: filePath.fileName }));
      }
    },
  ),

  c('command::ws:quick-new-note', ({ workspaceState }, { pathPrefix }, key) => {
    const { store, dispatch } = getCtx(key);
    const wsPaths = store.get(workspaceState.$noteWsPaths) || [];

    const untitledNotes = wsPaths
      .map((path) => path.fileNameWithoutExtension)
      .filter((name) => name.startsWith('untitled-'))
      .map((name) => {
        const num = Number.parseInt(name.replace('untitled-', ''), 10);
        return Number.isNaN(num) ? 0 : num;
      });

    const nextNum =
      untitledNotes.length > 0 ? Math.max(...untitledNotes) + 1 : 1;
    const newNoteName = `untitled-${nextNum}`;

    dispatch('command::ws:new-note-from-input', {
      inputPath: pathPrefix
        ? WsPath.pathJoin(pathPrefix, newNoteName)
        : newNoteName,
    });
  }),

  c('command::ws:create-directory', (_, { dirWsPath }, key) => {
    const { dispatch } = getCtx(key);
    const dirPath = WsPath.fromString(dirWsPath).asDir();

    if (!dirPath) {
      throwAppError(
        'error::ws-path:invalid-ws-path',
        t.app.errors.wsPath.invalidDirectoryPath,
        {
          invalidPath: dirWsPath,
        },
      );
    }
    // We do not support bare directories, so create a note as a placeholder
    dispatch('command::ws:quick-new-note', {
      pathPrefix: dirPath.path,
    });
  }),

  c(
    'command::ws:rename-directory',
    async (
      { editorEngine, fileSystem, userActivityService, workspaceState },
      { oldDirWsPath, newDirWsPath },
      key,
    ) => {
      const { store } = getCtx(key);
      const oldDir = assertDirectoryWsPath(oldDirWsPath);
      const newDir = assertDirectoryWsPath(newDirWsPath);

      if (oldDir.wsName !== newDir.wsName) {
        throwAppError(
          'error::file:invalid-operation',
          t.app.errors.file.cannotRenameToDifferentWorkspace,
          {
            oldWsPath: oldDirWsPath,
            newWsPath: newDirWsPath,
            operation: 'rename-directory',
          },
        );
      }

      if (oldDir.path === newDir.path) {
        return;
      }

      if (newDir.path.startsWith(oldDir.path)) {
        throwAppError(
          'error::file:invalid-operation',
          t.app.errors.file.cannotMoveDuringRename,
          {
            oldWsPath: oldDirWsPath,
            newWsPath: newDirWsPath,
            operation: 'rename-directory',
          },
        );
      }

      const wsPaths = store.get(workspaceState.$wsPaths);
      const descendants = wsPaths.filter((path) =>
        isUnderDirectory(WsPath.fromString(path.wsPath), oldDir),
      );

      if (descendants.length === 0) {
        return;
      }

      const pairs = descendants.map((path) => {
        const filePath = WsPath.assertFile(path.wsPath);
        const suffix = filePath.path.slice(oldDir.path.length);
        return {
          oldWsPath: filePath.wsPath,
          newWsPath: WsPath.fromParts(
            oldDir.wsName,
            WsPath.pathJoin(newDir.path, suffix),
          ).wsPath,
        };
      });

      const oldPathSet = new Set(pairs.map((pair) => pair.oldWsPath));
      const existingPathSet = new Set(wsPaths.map((path) => path.wsPath));
      for (const pair of pairs) {
        if (
          existingPathSet.has(pair.newWsPath) &&
          !oldPathSet.has(pair.newWsPath)
        ) {
          throwAppError(
            'error::file:already-existing',
            t.app.errors.file.alreadyExistsInDest({
              fileName: WsPath.assertFile(pair.newWsPath).fileName,
            }),
            {
              wsPath: pair.newWsPath,
            },
          );
        }
      }

      await assertSourceSavesDrained(editorEngine, pairs, 'rename');

      try {
        await fileSystem.renameFiles(pairs);
      } catch (error) {
        toast.error(t.app.toasts.folderRenameFailed);
        throw error;
      }

      const starResult = await userActivityService.relocateStarredItems(
        pairs.map(({ oldWsPath, newWsPath }) => ({
          oldItem: WsPath.fromString(oldWsPath),
          newItem: WsPath.fromString(newWsPath),
        })),
      );
      const folderName = basename(newDir.path);
      if (starResult === 'failed') {
        toast.warning(
          t.app.toasts.folderRenameStarUpdateFailed({ folderName }),
        );
      } else {
        toast.success(t.app.toasts.folderRenamed({ folderName }));
      }
    },
  ),

  c(
    'command::ws:delete-directory',
    async ({ fileSystem, workspaceState }, { dirWsPath }, key) => {
      const { store } = getCtx(key);
      const dirPath = assertDirectoryWsPath(dirWsPath);
      const descendants = store
        .get(workspaceState.$wsPaths)
        .filter((path) =>
          isUnderDirectory(WsPath.fromString(path.wsPath), dirPath),
        );

      if (descendants.length === 0) {
        return;
      }

      // Delete first, then leave the route stable. The editor and asset pages
      // derive existence from workspace-state atoms and render not-found states
      // when the routed file disappears.
      try {
        await fileSystem.deleteFiles(descendants.map((path) => path.wsPath));
        toast.success(
          t.app.toasts.folderDeleted({ folderName: basename(dirPath.path) }),
        );
      } catch (error) {
        toast.error(t.app.toasts.folderDeleteFailed);
        throw error;
      }
    },
  ),
  c('command::ws:go-ws-home', ({ navigation }) => {
    navigation.goWorkspace();
  }),

  c('command::ws:refresh-file-tree', ({ fileSystem }) => {
    fileSystem.refreshFileTree();
  }),

  c(
    'command::ws:clone-note',
    async ({ workspaceState, fileSystem, navigation }, _args, key) => {
      const { store } = getCtx(key);
      const currentWsPath = store.get(workspaceState.$currentWsPath);

      if (!currentWsPath) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.noNoteOpenToClone,
          {},
        );
      }

      // Determine base name by stripping any existing '-copy-<n>' suffix
      const origName = currentWsPath.fileNameWithoutExtension;
      const copyRegex = /^(.*?)(-copy-\d+)?$/;
      const match = origName.match(copyRegex);
      const base = match ? match[1] : origName;

      // Get all sibling notes in the same directory
      const wsNotes = store.get(workspaceState.$noteWsPaths);
      const siblingNames = new Set<string>();
      for (const note of wsNotes) {
        const noteParsed = WsPath.fromString(note.wsPath);
        const noteFile = noteParsed.asFile();
        if (noteFile) {
          const noteParent = noteFile.getParent();
          if (noteParent?.path === currentWsPath.getParent()?.path) {
            siblingNames.add(noteFile.fileNameWithoutExtension);
          }
        }
      }

      // Find the smallest copy number that is not already used
      let copyNumber = 1;
      let candidate = `${base}-copy-${copyNumber}`;
      while (siblingNames.has(candidate)) {
        copyNumber++;
        candidate = `${base}-copy-${copyNumber}`;
      }

      const newFileName = candidate + WsPath.DEFAULT_NOTE_EXTENSION;

      // Use replaceFileName to create the new WsPath
      const newWsPath = currentWsPath.replaceFileName(newFileName).wsPath;

      const originalFile = await fileSystem.readFile(currentWsPath.wsPath);
      if (!originalFile) {
        throwAppError(
          'error::file:invalid-note-path',
          t.app.errors.file.originalNoteNotFound,
          {
            invalidWsPath: currentWsPath.wsPath,
          },
        );
      }
      const content = await originalFile.text();

      await fileSystem.createFile(
        newWsPath,
        new File([content], newFileName, { type: 'text/plain' }),
      );

      navigation.goWsPath(newWsPath);
    },
  ),

  c(
    'command::ws:daily-note',
    async ({ workspaceState, fileSystem, navigation }, args, key) => {
      const { store, dispatch } = getCtx(key);
      const wsName = store.get(workspaceState.$currentWsName);
      const currentWsPath = store.get(workspaceState.$currentWsPath);

      if (!wsName) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.noWorkspaceForDailyNote,
          {},
        );
      }

      const today = args?.date ? new Date(args.date) : new Date();

      // Format date as YYYY-MMM-DD
      const year = today.getFullYear();
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const month = monthNames[today.getMonth()];
      const day = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      const fileName = `${formattedDate}-daily${WsPath.DEFAULT_NOTE_EXTENSION}`;

      const parentDir =
        currentWsPath?.getParent() || WsDirPath.fromString(`${wsName}:`);

      const dailyNotePath = parentDir.createFilePath(fileName);
      const dailyNoteWsPath = dailyNotePath.wsPath;

      const exists = await fileSystem.exists(dailyNoteWsPath);

      if (exists) {
        navigation.goWsPath(dailyNoteWsPath);
      } else {
        dispatch('command::ws:create-note', {
          wsPath: dailyNoteWsPath,
          navigate: true,
        });
      }
    },
  ),

  c(
    'command::workspace:toggle-star',
    async (
      { workspaceState, userActivityService },
      { wsPath: argWsPath },
      key,
    ) => {
      const { store } = getCtx(key);
      const currentOpenWsPath = store.get(
        workspaceState.$currentWsPath,
      )?.wsPath;
      const wsPathToToggleString = argWsPath ?? currentOpenWsPath;

      if (!wsPathToToggleString) {
        throwAppError(
          'error::workspace:no-note-opened',
          t.app.errors.workspace.noNoteOpened,
          {},
        );
        return;
      }

      await userActivityService.toggleStarItem(
        WsPath.fromString(wsPathToToggleString),
      );
    },
  ),
];
