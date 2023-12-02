import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  IndexedDBFileSystem,
} from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  FileStorageOpts,
} from '@bangle.io/shared-types';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

// TODO: watch for changes in the indexeddb by other tabs and emit events

export class FileStorageIndexedDB implements BaseFileStorageProvider {
  // setting it to string for easier subclassing while testing
  name: string = WorkspaceType.Browser;
  displayName = 'Browser Storage';
  description = 'Saves data in your browsers local storage';

  private options!: FileStorageOpts;

  onInit(options: FileStorageOpts) {
    this.options = options;
  }

  private _idb = new IndexedDBFileSystem();

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.writeFile(wsPath, file);

    this.options.onChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this._idb.unlink(toFSPath(wsPath));
    this.options.onChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
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

  async fileStat(wsPath: string) {
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

  async listAllFiles(abortSignal: AbortSignal): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = await this._idb.opendirRecursive(
      this.options.wsName,
    );

    abortSignal.throwIfAborted();

    files = rawPaths
      .map((r) => {
        const wsPath = fromFsPath(r);

        return wsPath;
      })
      .filter((r): r is string => Boolean(r));

    const result = files.sort((a, b) => a.localeCompare(b));

    return result;
  }

  onNewWorkspace(wsName: string, createOpts: any) {
    // no-op
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }

    return this._idb.readFile(toFSPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    {
      newWsPath,
    }: {
      newWsPath: string;
    },
  ): Promise<void> {
    await this._idb.rename(toFSPath(wsPath), toFSPath(newWsPath));

    this.options.onChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    const path = toFSPath(wsPath);
    await this._idb.writeFile(path, file);
    this.options.onChange({
      type: 'update',
      wsPath,
    });
  }
}
