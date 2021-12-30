import { workerAbortable } from '@bangle.io/abortable-worker';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { searchPmNode } from '@bangle.io/search-pm-node';
import { assertSignal } from '@bangle.io/utils';
import { FileOps, fzfSearchNoteWsPaths } from '@bangle.io/workspaces';
import { filePathToWsPath, resolvePath } from '@bangle.io/ws-path';
import { BaseError } from '@bangle.io/base-error';
import * as zip from '@zip.js/zip.js/dist/zip-no-worker.min.js';
import { WorkerErrorCode } from '@bangle.io/constants';

export function abortableServices({
  extensionRegistry,
}: {
  extensionRegistry: ExtensionRegistry;
}) {
  const services = workerAbortable(({ abortWrapper }) => {
    return {
      abortableSearchWsForPmNode: abortWrapper(
        searchWsForPmNode(extensionRegistry),
      ),
      abortableFzfSearchNoteWsPaths: abortWrapper(fzfSearchNoteWsPaths),
      abortableBackupAllFiles: abortWrapper(backupAllFiles()),
      abortableReadAllFilesBackup: abortWrapper(readAllFilesBackup()),
      abortableCreateWorkspaceFromBackup: abortWrapper(
        createWorkspaceFromBackup(),
      ),
    };
  });

  return services;
}

function searchWsForPmNode(extensionRegistry: ExtensionRegistry) {
  return async (
    abortSignal: AbortSignal,
    wsName: string,
    query: string,
    atomSearchTypes: Parameters<typeof searchPmNode>[4],
    opts?: Parameters<typeof searchPmNode>[5],
  ) => {
    const wsPaths = await FileOps.listAllNotes(wsName);
    assertSignal(abortSignal);

    const getDoc = async (wsPath: string) =>
      FileOps.getDoc(
        wsPath,
        extensionRegistry.specRegistry,
        extensionRegistry.markdownItPlugins,
      );

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

function backupAllFiles() {
  return async (abortSignal: AbortSignal, wsName: string): Promise<File> => {
    const wsPaths = await FileOps.listAllFiles(wsName);
    let zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'), {
      useWebWorkers: false,
    });

    for (const path of wsPaths) {
      const fileBlob = await FileOps.getFile(path);

      await zipWriter.add(
        encodeURIComponent(path),
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

function createWorkspaceFromBackup() {
  return async (
    abortSignal: AbortSignal,
    wsName: string,
    backupFile: File,
  ): Promise<void> => {
    const wsPaths = await FileOps.listAllFiles(wsName);
    if (wsPaths.length > 0) {
      throw new BaseError(
        'Can only use backup files on an empty workspace',
        WorkerErrorCode.EMPTY_WORKSPACE_NEEDED,
      );
    }

    const files = await readAllFilesBackup()(abortSignal, backupFile);

    for (const file of files) {
      const { filePath } = resolvePath(decodeURIComponent(file.name));
      const newWsPath = filePathToWsPath(wsName, filePath);
      await FileOps.saveFile(newWsPath, file);
    }
  };
}
