import { FILE_NOT_FOUND_ERROR } from '@bangle.io/baby-fs';
import type { StorageProviderOnChange } from '@bangle.io/shared-types';
import {
  assertSignal,
  BaseError,
  errorParse,
  errorSerialize,
} from '@bangle.io/utils';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

import type { BaseStorageProvider, StorageOpts } from './base-storage';

// WARNING: This saves data in memory and is not persistent.
export class MemoryStorageProvider implements BaseStorageProvider {
  name: string = 'MemoryStorageProvider';
  displayName = 'Memory Storage';
  description = 'Temporary storage';
  onChange: StorageProviderOnChange = () => {};

  _fileStat = new Map<
    string,
    {
      ctime: number;
      mtime: number;
    }
  >();

  _store = new Map<string, File>();
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
    await this._fileStat.delete(toFSPath(wsPath));
    await this._store.delete(toFSPath(wsPath));

    this.onChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    const path = toFSPath(wsPath);

    return this._store.has(path);
  }

  async fileStat(wsPath: string, opts: StorageOpts) {
    const path = toFSPath(wsPath);
    const stat = await this._fileStat.get(path);

    if (!stat) {
      throw new BaseError({
        message: `File not found: ${path}`,
        code: FILE_NOT_FOUND_ERROR,
      });
    }

    return {
      ctime: stat.ctime,
      mtime: stat.mtime,
    };
  }

  isSupported() {
    return true;
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = Array.from(this._store.keys());

    assertSignal(abortSignal);

    files = rawPaths
      .map((r) => {
        const wsPath = fromFsPath(r);

        return wsPath;
      })
      .filter((r): r is string => Boolean(r))
      .filter((r) => r.startsWith(wsName));

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

    return this._store.get(toFSPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    const file = await this.readFile(wsPath, opts);

    if (!file) {
      throw new BaseError({
        message: `File not found: ${wsPath}`,
        code: FILE_NOT_FOUND_ERROR,
      });
    }

    await this.deleteFile(wsPath, opts);
    await this.writeFile(newWsPath, file, opts);

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
    const stat = this._fileStat.get(path);

    await this._fileStat.set(path, {
      mtime: Date.now(),
      ctime: stat?.ctime || Date.now(),
    });

    await this._store.set(path, file);
    this.onChange({
      type: 'write',
      wsPath,
    });
  }
}
