import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  IndexedDBFileSystem,
} from '@bangle.io/baby-fs';
import { WorkspaceTypeBrowser } from '@bangle.io/constants';
import { assertSignal } from '@bangle.io/utils';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

import { BaseStorageProvider, StorageOpts } from './base-storage';

export class IndexedDbStorageProvider implements BaseStorageProvider {
  // TODO setting it to string for easier subclassing while testing
  name: string = WorkspaceTypeBrowser;
  displayName = 'Browser Storage';
  description = 'Saves data in your browsers local storage';

  private idb = new IndexedDBFileSystem();

  async newWorkspaceMetadata(wsName: string, createOpts: any) {}

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    const path = toFSPath(wsPath);
    try {
      await this.idb.stat(path);

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
    const stat = await this.idb.stat(path);

    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }
  async createFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    await this.writeFile(wsPath, file, opts);
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    await this.idb.unlink(toFSPath(wsPath));
  }

  async readFile(wsPath: string, opts: StorageOpts): Promise<File | undefined> {
    if (!(await this.fileExists(wsPath, opts))) {
      return undefined;
    }

    return this.idb.readFile(toFSPath(wsPath));
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = await this.idb.opendirRecursive(wsName);

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

  async writeFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    const path = toFSPath(wsPath);
    await this.idb.writeFile(path, file);
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    await this.idb.rename(toFSPath(wsPath), toFSPath(newWsPath));
  }
}
