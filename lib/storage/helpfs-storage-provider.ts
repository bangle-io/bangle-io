import { BaseError } from '@bangle.io/base-error';
import { HELP_DOCS_VERSION } from '@bangle.io/config';
import { HELP_FS_INDEX_WS_PATH, WorkspaceType } from '@bangle.io/constants';
import type { StorageProviderOnChange } from '@bangle.io/shared-types';
import { errorParse, errorSerialize } from '@bangle.io/utils';
import { toFSPath } from '@bangle.io/ws-path';

import type { BaseStorageProvider, StorageOpts } from './base-storage';
import { IndexedDbStorageProvider } from './indexed-db-storage-provider';

function readFileFromUnpkg(wsPath: string) {
  const filePath = toFSPath(wsPath);

  function fetchHelpFiles(path: string, json = false) {
    return fetch(
      `https://unpkg.com/bangle-io-help@${HELP_DOCS_VERSION}/docs/` + path,
    )
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) {
            return null;
          }

          throw new BaseError({
            message: `Encountered an error making request to unpkg.com ${r.status} ${r.statusText}`,
          });
        }

        return r;
      })
      .catch((z) => {
        if (z.message === 'Failed to fetch') {
          console.error('Failed to fetch helpfs');

          return undefined;
        }
        throw z;
      });
  }

  const splitted = filePath.split('/');
  const [, ...path] = splitted;

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
  name = WorkspaceType.Help;
  displayName = 'Help documentation';
  description = '';
  hidden = true;
  onChange: StorageProviderOnChange = () => {};

  private _idbProvider = new IndexedDbStorageProvider();
  async createFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    await this.writeFile(wsPath, file, opts);
    this.onChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }

    await this._idbProvider.deleteFile(wsPath, opts);
    this.onChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return true;
    }

    return this._idbProvider.fileExists(wsPath, opts);
  }

  async fileStat(wsPath: string, opts: StorageOpts) {
    return this._idbProvider.fileStat(wsPath, opts);
  }

  isSupported() {
    return true;
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    return [
      ...new Set([
        HELP_FS_INDEX_WS_PATH,
        ...(await this._idbProvider.listAllFiles(abortSignal, wsName, opts)),
      ]),
    ];
  }

  async newWorkspaceMetadata(wsName: string, createOpts: any) {}

  parseError(errorString: string) {
    try {
      return errorParse(JSON.parse(errorString));
    } catch (error) {
      return undefined;
    }
  }

  async readFile(wsPath: string, opts: StorageOpts): Promise<File | undefined> {
    const res = await readFileFromUnpkg(wsPath);

    if (res) {
      return res;
    }

    return this._idbProvider.readFile(wsPath, opts);
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }
    await this._idbProvider.renameFile(wsPath, newWsPath, opts);

    this.onChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  serializeError(error: Error) {
    return JSON.stringify(errorSerialize(error));
  }

  async writeFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }
    await this._idbProvider.writeFile(wsPath, file, opts);
    this.onChange({
      type: 'write',
      wsPath,
    });
  }
}
