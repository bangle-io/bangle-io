import * as zip from '@zip.js/zip.js/dist/zip-no-worker.min.js';

import { workerAbortable } from '@bangle.io/abortable-worker';
import { WorkerErrorCode } from '@bangle.io/constants';
import type { FzfOptions, FzfResultItem } from '@bangle.io/fzf-search';
import { byLengthAsc, byStartAsc, Fzf } from '@bangle.io/fzf-search';
import { searchPmNode } from '@bangle.io/search-pm-node';
import type {
  EternalVars,
  NaukarWorkerAPI,
  Node,
  WsName,
  WsPath,
} from '@bangle.io/shared-types';
import { assertSignal, BaseError } from '@bangle.io/utils';
import { fs } from '@bangle.io/workspace-info';
import {
  createWsPath,
  filePathToWsPath2,
  isValidNoteWsPath,
  resolvePath,
} from '@bangle.io/ws-path';

import type { NaukarStore } from '../store';

export type GetWsPaths = (
  wsName: WsName,
  abortSignal: AbortSignal,
) => Promise<WsPath[]>;

export const abortableInterface = (
  _: NaukarStore,
  eternalVars: EternalVars,
): NaukarWorkerAPI['abortable'] => {
  const services = workerAbortable(({ abortWrapper }) => {
    const getWsPaths: GetWsPaths = async (wsName, abortSignal) => {
      return (await fs.listFiles(wsName, abortSignal)).map((r) => {
        return createWsPath(r);
      });
    };

    const getNoteWsPaths: GetWsPaths = async (
      wsName: WsName,
      abortSignal: AbortSignal,
    ) => {
      return (await getWsPaths(wsName, abortSignal)).filter((wsPath) =>
        isValidNoteWsPath(wsPath),
      );
    };

    const _getDoc = async (wsPath: string) => {
      return fs.getNote(createWsPath(wsPath), eternalVars.extensionRegistry);
    };

    const _getFile = async (wsPath: WsPath) => {
      return fs.readFile(wsPath);
    };

    const _saveFile = async (wsPath: WsPath, file: File) => {
      return fs.writeFile(wsPath, file);
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

  const abortableInterface: NaukarWorkerAPI['abortable'] = services;

  return abortableInterface;
};

function searchWsForPmNode(
  getNoteWsPaths: GetWsPaths,
  getDoc: (wsPath: string) => Promise<Node | undefined>,
) {
  return async (
    abortSignal: AbortSignal,
    wsName: WsName,
    query: string,
    atomSearchTypes: Parameters<typeof searchPmNode>[4],
    opts?: Parameters<typeof searchPmNode>[5],
  ) => {
    assertSignal(abortSignal);
    const wsPaths = await getNoteWsPaths(wsName, abortSignal);

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
  getFile: (wsPath: WsPath) => Promise<File | undefined>,
) {
  return async (abortSignal: AbortSignal, wsName: WsName): Promise<File> => {
    const wsPaths = await getWsPaths(wsName, abortSignal);

    if (!wsPaths || wsPaths.length === 0) {
      throw new BaseError({
        message: 'Can not backup an empty workspace',
        code: WorkerErrorCode.EMPTY_WORKSPACE,
      });
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
  saveFile: (wsPath: WsPath, file: File) => Promise<void>,
) {
  return async (
    abortSignal: AbortSignal,
    wsName: WsName,
    backupFile: File,
  ): Promise<void> => {
    const wsPaths = await getWsPaths(wsName, abortSignal);

    if (!wsPaths || wsPaths.length > 0) {
      throw new BaseError({
        message: 'Can only use backup files on an empty workspace',
        code: WorkerErrorCode.EMPTY_WORKSPACE_NEEDED,
      });
    }

    const files = await readAllFilesBackup()(abortSignal, backupFile);

    for (const file of files) {
      const { filePath } = resolvePath(decodeURIComponent(file.name));
      const newWsPath = filePathToWsPath2(wsName, filePath);
      await saveFile(newWsPath, file);
    }
  };
}

function fzfSearchNoteWsPaths(getNoteWsPaths: GetWsPaths) {
  return async (
    abortSignal: AbortSignal,
    wsName: WsName,
    query: string,
    limit: number = 128,
  ): Promise<Array<FzfResultItem<WsPath>>> => {
    const wsPaths: string[] = await getNoteWsPaths(wsName, abortSignal);

    assertSignal(abortSignal);

    if (!wsPaths || wsPaths.length === 0) {
      return [];
    }

    const options: FzfOptions = {
      limit: limit,
      selector: (item) => resolvePath(item, true).filePath,
      fuzzy: query.length <= 4 ? 'v1' : 'v2',
      tiebreakers: [byLengthAsc, byStartAsc],
    };

    const fzf = new Fzf(wsPaths, options);

    const result: Array<FzfResultItem<any>> = fzf.find(query);

    return result;
  };
}
