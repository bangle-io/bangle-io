import { throwAppError } from '@bangle.io/base-utils';
import {
  appendNoteExtension,
  assertSplitWsPath,
  assertedResolvePath,
  filePathToWsPath,
  pathJoin,
  resolveDirWsPath,
} from '@bangle.io/ws-path';
import { c, getCtx } from './helper';

import { validateInputPath } from './utils';

export const wsCommandHandlers = [
  c('command::ws:new-note-from-input', ({ navigation }, { inputPath }, key) => {
    const { dispatch } = getCtx(key);
    validateInputPath(inputPath);

    const { wsName } = navigation.resolveAtoms();

    if (!wsName) {
      throwAppError('error::ws-path:create-new-note', 'No workspace open', {
        invalidWsPath: inputPath,
      });
    }

    inputPath = appendNoteExtension(inputPath);
    const wsPath = filePathToWsPath({ wsName, inputPath });

    dispatch('command::ws:create-note', { wsPath, navigate: true });
  }),

  c(
    'command::ws:create-note',
    ({ fileSystem, navigation }, { wsPath, navigate }) => {
      const { wsName } = assertSplitWsPath(wsPath);

      if (!wsName) {
        throwAppError('error::ws-path:create-new-note', 'No workspace open', {
          invalidWsPath: wsPath,
        });
      }

      const { fileNameWithoutExt } = assertedResolvePath(wsPath);

      void fileSystem
        .createFile(
          wsPath,
          new File(
            [`I am content of ${fileNameWithoutExt}`],
            fileNameWithoutExt,
            {
              type: 'text/plain',
            },
          ),
        )
        .then(() => {
          if (navigate) {
            navigation.goWsPath(wsPath);
          }
        });
    },
  ),

  c('command::ws:go-workspace', ({ navigation }, { wsName }) => {
    navigation.goWorkspace(wsName);
  }),
  c('command::ws:go-ws-path', ({ navigation }, { wsPath }) => {
    navigation.goWsPath(wsPath);
  }),

  c(
    'command::ws:delete-workspace',
    ({ workspaceOps, navigation }, { wsName }) => {
      if (navigation.resolveAtoms().wsName === wsName) {
        navigation.goHome();
      }
      workspaceOps.deleteWorkspaceInfo(wsName);
    },
  ),

  c('command::ws:delete-ws-path', ({ fileSystem, navigation }, { wsPath }) => {
    if (navigation.resolveAtoms().wsPath === wsPath) {
      navigation.goWorkspace();
    }
    fileSystem.deleteFile(wsPath);
  }),

  c(
    'command::ws:rename-ws-path',
    ({ fileSystem, navigation }, { wsPath, newWsPath }) => {
      const { wsName } = assertSplitWsPath(wsPath);
      const { wsName: wsNameNew } = assertSplitWsPath(newWsPath);

      if (wsName !== wsNameNew) {
        throwAppError(
          'error::file:invalid-operation',
          'Cannot rename note to a different workspace',
          {
            operation: 'rename',
            oldWsPath: wsPath,
            newWsPath,
          },
        );
      }

      const needsRedirect = navigation.resolveAtoms().wsPath === wsPath;
      if (needsRedirect) {
        navigation.goWorkspace();
      }

      void fileSystem
        .renameFile({
          oldWsPath: wsPath,
          newWsPath,
        })
        .then(() => {
          if (needsRedirect) {
            navigation.goWsPath(newWsPath);
          }
        });
    },
  ),

  c(
    'command::ws:move-ws-path',
    (
      { fileSystem, navigation, workspaceState },
      { wsPath, destDirWsPath },
      key,
    ) => {
      const { store } = getCtx(key);

      const { fileName } = assertedResolvePath(wsPath);
      const resolvedDirPath = resolveDirWsPath(destDirWsPath);
      if (!resolvedDirPath) {
        throwAppError('error::workspace:not-opened', 'No workspace open', {
          wsPath,
        });
      }

      const newWsPath = filePathToWsPath({
        wsName: resolvedDirPath.wsName,
        inputPath: pathJoin(resolvedDirPath.dirPath, fileName),
      });

      if (wsPath === newWsPath) {
        return;
      }

      const existingWsPaths = store.get(workspaceState.$wsPaths);
      if (existingWsPaths.includes(newWsPath)) {
        throwAppError(
          'error::file:already-existing',
          'A note with the same name already exists in the destination directory',
          {
            wsPath: newWsPath,
          },
        );
      }

      const needsRedirect = navigation.resolveAtoms().wsPath === wsPath;
      if (needsRedirect) {
        navigation.goWorkspace();
      }

      void fileSystem
        .renameFile({
          oldWsPath: wsPath,
          newWsPath,
        })
        .then(() => {
          if (needsRedirect) {
            navigation.goWsPath(newWsPath);
          }
        });
    },
  ),

  c('command::ws:quick-new-note', ({ workspaceState }, { pathPrefix }, key) => {
    const { store, dispatch } = getCtx(key);
    const wsPaths = store.get(workspaceState.$wsPaths) || [];

    const untitledNotes = wsPaths
      .map((path) => assertedResolvePath(path).fileNameWithoutExt)
      .filter((name) => name.startsWith('untitled-'))
      .map((name) => {
        const num = Number.parseInt(name.replace('untitled-', ''));
        return Number.isNaN(num) ? 0 : num;
      });

    const nextNum =
      untitledNotes.length > 0 ? Math.max(...untitledNotes) + 1 : 1;
    const newNoteName = `untitled-${nextNum}`;

    dispatch('command::ws:new-note-from-input', {
      inputPath: pathJoin(pathPrefix || '', newNoteName),
    });
  }),

  c('command::ws:create-directory', (_, { dirWsPath }, key) => {
    const { dispatch } = getCtx(key);
    const resolvedDirPath = resolveDirWsPath(dirWsPath);

    if (!resolvedDirPath) {
      throwAppError(
        'error::ws-path:invalid-ws-path',
        'Invalid directory path',
        {
          invalidPath: dirWsPath,
        },
      );
    }
    // We do not support bare directories, so this hack allows us to
    // create a directory by creating a note
    dispatch('command::ws:quick-new-note', {
      pathPrefix: resolvedDirPath.dirPath,
    });
  }),
];
