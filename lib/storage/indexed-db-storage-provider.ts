import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  IndexedDBFileSystem,
} from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import type { StorageProviderOnChange } from '@bangle.io/shared-types';
import { assertSignal, errorParse, errorSerialize } from '@bangle.io/utils';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

import type { BaseStorageProvider, StorageOpts } from './base-storage';

export class IndexedDbStorageProvider implements BaseStorageProvider {
  // TODO setting it to string for easier subclassing while testing
  name: string = WorkspaceType.Browser;
  displayName = 'Browser Storage';
  description = 'Saves data in your browsers local storage';
  onChange: StorageProviderOnChange = () => {};

  private _idb = new IndexedDBFileSystem();
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
    await this._idb.unlink(toFSPath(wsPath));
    this.onChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    const path = toFSPath(wsPath);
    try {
      await this._idb.stat(path);

      return true;
    } catch (error) {
      if (error instanceof BaseFileSystemError) {
        if (error.code === FILE_NOT_FOUND_ERROR) {
          return false;
        }
      }
      throw error;
    }
  }

  async fileStat(wsPath: string, opts: StorageOpts) {
    const path = toFSPath(wsPath);
    const stat = await this._idb.stat(path);

    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }

  isSupported() {
    return globalThis.indexedDB != null;
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = await this._idb.opendirRecursive(wsName);

    assertSignal(abortSignal);

    files = rawPaths
      .map((r) => {
        const wsPath = fromFsPath(r);

        return wsPath;
      })
      .filter((r): r is string => Boolean(r));

    const result = files.sort((a, b) => a.localeCompare(b));

    return result;
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
    if (!(await this.fileExists(wsPath, opts))) {
      return undefined;
    }

    return this._idb.readFile(toFSPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    await this._idb.rename(toFSPath(wsPath), toFSPath(newWsPath));

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
    const path = toFSPath(wsPath);
    await this._idb.writeFile(path, file);
    this.onChange({
      type: 'write',
      wsPath,
    });
  }
}
