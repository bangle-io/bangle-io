import type { Node } from '@bangle.dev/pm';

import { BaseError } from '@bangle.io/base-error';
import { HELP_DOCS_VERSION } from '@bangle.io/config';
import { HELP_FS_INDEX_WS_PATH, WorkspaceTypeHelp } from '@bangle.io/constants';
import { toFSPath } from '@bangle.io/ws-path';

import { BaseStorageProvider, StorageOpts } from './base-storage';
import { IndexedDbStorageProvider } from './indexed-db-storage-provider';

function readFileFromUnpkg(wsPath: string) {
  const filePath = toFSPath(wsPath);

  function fetchHelpFiles(path: string, json = false) {
    return fetch(
      `https://unpkg.com/bangle-io-help@${HELP_DOCS_VERSION}/docs/` + path,
    ).then((r) => {
      if (!r.ok) {
        if (r.status === 404) {
          return null;
        }
        return Promise.reject(
          new BaseError(
            `Encountered an error making request to unpkg.com ${r.status} ${r.statusText}`,
          ),
        );
      }
      return r;
    });
  }

  const splitted = filePath.split('/');
  const [wsName, ...path] = splitted;

  return fetchHelpFiles(path.join('/'))
    .then((r) => r?.blob())
    .then((r) => {
      if (!r) {
        return undefined;
      }
      const name = splitted[splitted.length - 1]!;
      const file = new File([r], name);
      return file;
    });
}

export class HelpFsStorageProvider implements BaseStorageProvider {
  name = WorkspaceTypeHelp;
  displayName = 'Help documentation';
  description = '';
  hidden = true;

  private idbProvider = new IndexedDbStorageProvider();

  async newWorkspaceMetadata(wsName: string, createOpts: any) {}

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return true;
    }

    return this.idbProvider.fileExists(wsPath, opts);
  }

  async fileStat(wsPath: string, opts: StorageOpts) {
    return this.idbProvider.fileStat(wsPath, opts);
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }

    await this.idbProvider.deleteFile(wsPath, opts);
  }

  async getDoc(wsPath: string, opts: StorageOpts) {
    const upstreamFile = await readFileFromUnpkg(wsPath);

    if (upstreamFile) {
      return this.idbProvider.fileToDoc(upstreamFile, opts);
    }

    return this.idbProvider.getDoc(wsPath, opts);
  }

  async getFile(wsPath: string, opts: StorageOpts): Promise<File> {
    const res = await readFileFromUnpkg(wsPath);

    if (res) {
      return res;
    }

    return this.idbProvider.getFile(wsPath, opts);
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    return [
      HELP_FS_INDEX_WS_PATH,
      ...(await this.idbProvider.listAllFiles(abortSignal, wsName, opts)),
    ];
  }

  async saveDoc(wsPath: string, doc: Node, opts: StorageOpts): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }

    await this.idbProvider.saveDoc(wsPath, doc, opts);
  }

  async saveFile(wsPath: string, file: File, opts: StorageOpts): Promise<void> {
    return this.idbProvider.saveFile(wsPath, file, opts);
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }
    await this.idbProvider.renameFile(wsPath, newWsPath, opts);
  }
}
