import { throwAppError } from '@bangle.io/base-utils';
import {
  assertSplitWsPath,
  assertedResolvePath,
  filePathToWsPath,
  pathJoin,
  resolveDirWsPath,
} from '@bangle.io/ws-path';
import { c, getCtx } from './helper';

import type { ThemePreference } from '@bangle.io/types';
import { Briefcase, FilePlus, Sun, Trash2 } from 'lucide-react';
import { validateInputPath } from './utils';

export const wsCommandHandlers = [
  c(
    'command::ws:new-note-from-input',
    ({ fileSystem, navigation, workspaceState }, { inputPath }, key) => {
      validateInputPath(inputPath);
      const { store } = getCtx(key);

      const { wsName } = navigation.resolveAtoms();

      if (!wsName) {
        throwAppError('error::ws-path:create-new-note', 'No workspace open', {
          invalidWsPath: inputPath,
        });
      }
      if (!inputPath.endsWith('.md')) {
        inputPath = `${inputPath}.md`;
      }
      const newWsPath = filePathToWsPath({ wsName, inputPath });

      const existingWsPaths = store.get(workspaceState.$wsPaths);
      if (existingWsPaths.includes(newWsPath)) {
        throwAppError(
          'error::file:invalid-note-path',
          'Note with the given name already already exists',
          {
            invalidWsPath: newWsPath,
          },
        );
      }

      const { fileNameWithoutExt } = assertedResolvePath(newWsPath);

      void fileSystem
        .createFile(
          newWsPath,
          new File(
            [`I am content of ${fileNameWithoutExt}`],
            fileNameWithoutExt,
            {
              type: 'text/plain',
            },
          ),
        )
        .then(() => {
          navigation.goWsPath(newWsPath);
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
];
