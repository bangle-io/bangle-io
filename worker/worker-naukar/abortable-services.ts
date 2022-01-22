import * as zip from '@zip.js/zip.js/dist/zip-no-worker.min.js';

import type { Node } from '@bangle.dev/pm';

import { workerAbortable } from '@bangle.io/abortable-worker';
import { BaseError } from '@bangle.io/base-error';
import { WorkerErrorCode } from '@bangle.io/constants';
import { searchPmNode } from '@bangle.io/search-pm-node';
import {
  getFile,
  getNote,
  saveFile,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { assertSignal, asssertNotUndefined } from '@bangle.io/utils';
import { filePathToWsPath, resolvePath } from '@bangle.io/ws-path';

import { fzfSearchNoteWsPaths } from './abortable-services/fzf-search-notes-ws-path';
import type { StoreRef } from './naukar';

type GetWsPaths = () => string[] | undefined;
export function abortableServices({ storeRef }: { storeRef: StoreRef }) {
  const services = workerAbortable(({ abortWrapper }) => {
    const getNoteWsPaths: GetWsPaths = () => {
      const state = storeRef.current?.state;
      if (!state) {
        return undefined;
      }
      const noteWsPaths =
        workspaceSliceKey.getSliceStateAsserted(state).noteWsPaths;

      return noteWsPaths;
    };

    const getWsPaths: GetWsPaths = () => {
      const state = storeRef.current?.state;
      if (!state) {
        return undefined;
      }
      const noteWsPaths =
        workspaceSliceKey.getSliceStateAsserted(state).wsPaths;

      return noteWsPaths;
    };

    const _getDoc = async (wsPath: string) => {
      const store = storeRef.current;
      asssertNotUndefined(store, 'store cannot be undefined');

      return getNote(wsPath)(store.state, store.dispatch);
    };

    const _getFile = async (wsPath: string) => {
      const store = storeRef.current;

      asssertNotUndefined(store, 'store cannot be undefined');

      return getFile(wsPath)(store.state, store.dispatch, store);
    };

    const _saveFile = async (wsPath: string, file: File) => {
      const store = storeRef.current;

      asssertNotUndefined(store, 'store cannot be undefined');

      await saveFile(wsPath, file)(store.state, store.dispatch, store);
    };

    return {
      abortableSearchWsForPmNode: abortWrapper(
        searchWsForPmNode(getNoteWsPaths, _getDoc),
      ),
      abortableFzfSearchNoteWsPaths: abortWrapper(
        fzfSearchNoteWsPaths(getNoteWsPaths),
      ),
      abortableBackupAllFiles: abortWrapper(
        backupAllFiles(getWsPaths, _getFile),
      ),
      abortableReadAllFilesBackup: abortWrapper(readAllFilesBackup()),
      abortableCreateWorkspaceFromBackup: abortWrapper(
        createWorkspaceFromBackup(getWsPaths, _saveFile),
      ),
    };
  });

  return services;
}

function searchWsForPmNode(
  getNoteWsPaths: GetWsPaths,
  getDoc: (wsPath: string) => Promise<Node | undefined>,
) {
  return async (
    abortSignal: AbortSignal,
    wsName: string,
    query: string,
    atomSearchTypes: Parameters<typeof searchPmNode>[4],
    opts?: Parameters<typeof searchPmNode>[5],
  ) => {
    assertSignal(abortSignal);

    const wsPaths = getNoteWsPaths();

    if (!wsPaths) {
      return [];
    }

    return searchPmNode(
      abortSignal,
      query,
      wsPaths,
      getDoc,
      atomSearchTypes,
      opts,
    );
  };
}

function backupAllFiles(
  getWsPaths: GetWsPaths,
  getFile: (wsPath: string) => Promise<File | undefined>,
) {
  return async (abortSignal: AbortSignal, wsName: string): Promise<File> => {
    const wsPaths = getWsPaths();
    if (!wsPaths || wsPaths.length === 0) {
      throw new BaseError(
        'Can not backup an empty workspace',
        WorkerErrorCode.EMPTY_WORKSPACE,
      );
    }

    let zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'), {
      useWebWorkers: false,
    });

    for (const wsPath of wsPaths) {
      const fileBlob = await getFile(wsPath);
      if (!fileBlob) {
        continue;
      }
      await zipWriter.add(
        encodeURIComponent(wsPath),
        new zip.BlobReader(fileBlob),
        {
          bufferedWrite: true,
          signal: abortSignal,
        },
      );
    }

    const val = await zipWriter.close();

    assertSignal(abortSignal);

    const result = new File([val], `${wsName}-backup`, {
      type: 'application/zip',
    });

    return result;
  };
}

function readAllFilesBackup() {
  return async (
    abortSignal: AbortSignal,
    backupFile: File,
  ): Promise<File[]> => {
    const zipReader = new zip.ZipReader(new zip.BlobReader(backupFile), {
      useWebWorkers: false,
    });
    const entries = await zipReader.getEntries();

    let result: File[] = [];
    for (const entry of entries) {
      const ext = entry.filename.split('.').pop()!.toLowerCase();
      let mimeType =
        ext === 'md' ? 'text/markdown' : zip.getMimeType(entry.filename);

      assertSignal(abortSignal);

      const blob: Blob = await entry.getData?.(new zip.BlobWriter(mimeType));
      result.push(
        new File([blob], entry.filename, {
          type: mimeType,
        }),
      );
    }

    return result;
  };
}

function createWorkspaceFromBackup(
  getWsPaths: GetWsPaths,
  saveFile: (wsPath, file: File) => Promise<void>,
) {
  return async (
    abortSignal: AbortSignal,
    wsName: string,
    backupFile: File,
  ): Promise<void> => {
    const wsPaths = getWsPaths();

    if (!wsPaths || wsPaths.length > 0) {
      throw new BaseError(
        'Can only use backup files on an empty workspace',
        WorkerErrorCode.EMPTY_WORKSPACE_NEEDED,
      );
    }

    const files = await readAllFilesBackup()(abortSignal, backupFile);

    for (const file of files) {
      const { filePath } = resolvePath(decodeURIComponent(file.name));
      const newWsPath = filePathToWsPath(wsName, filePath);
      await saveFile(newWsPath, file);
    }
  };
}
