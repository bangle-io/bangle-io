import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  NativeBrowserFileSystem,
} from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import type { StorageProviderOnChange } from '@bangle.io/shared-types';
import type { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { assertSignal, errorParse, errorSerialize } from '@bangle.io/utils';
import { fromFsPath, resolvePath, toFSPath } from '@bangle.io/ws-path';

export const allowedFile = (name: string) => {
  return name.endsWith('.md') || name.endsWith('.png');
};

export abstract class BaseFsStorageProvider implements BaseStorageProvider {
  onChange: StorageProviderOnChange = () => {};

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
    const { wsName } = resolvePath(wsPath);

    await (await this._getFs(wsName, opts)).unlink(toFSPath(wsPath));
    this.onChange({
      type: 'delete',
      wsPath,
    });
  }

  abstract description: string;
  abstract displayName: string;

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    const path = toFSPath(wsPath);
    const { wsName } = resolvePath(wsPath);

    try {
      await (await this._getFs(wsName, opts)).stat(path);

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
    const { wsName } = resolvePath(wsPath);

    const stat = await (await this._getFs(wsName, opts)).stat(path);

    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }

  abstract isSupported(): boolean;
  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = await (
      await this._getFs(wsName, opts)
    ).opendirRecursive(wsName);

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

  abstract name: string;
  abstract newWorkspaceMetadata(
    wsName: string,
    createOpts: any,
  ): Promise<{ [key: string]: any }> | Promise<void>;

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

    const { wsName } = resolvePath(wsPath);

    return (await this._getFs(wsName, opts)).readFile(toFSPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    const { wsName } = resolvePath(wsPath);

    await (
      await this._getFs(wsName, opts)
    ).rename(toFSPath(wsPath), toFSPath(newWsPath));

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
    const { wsName } = resolvePath(wsPath);

    await (await this._getFs(wsName, opts)).writeFile(path, file);
    this.onChange({
      type: 'write',
      wsPath,
    });
  }

  protected abstract _getFs(
    wsName: string,
    opts: StorageOpts,
  ): Promise<NativeBrowserFileSystem>;
}

export class NativeFsStorageProvider extends BaseFsStorageProvider {
  name: string = WorkspaceType.NativeFS;
  displayName = 'File system storage';
  description = 'Saves data in your file system';
  onChange: StorageProviderOnChange = () => {};

  isSupported() {
    // TODO: we donot have a great way to check if native fs is supported
    // in the worker thread. We need have a universal configuration that is passed to worker
    // and main thread on initialization.
    return true;
  }

  async newWorkspaceMetadata(wsName: string, createOpts: any) {
    const { rootDirHandle } = createOpts;

    if (!rootDirHandle) {
      throw new Error(
        `rootDirHandle is necessary for creating nativefs workspace`,
      );
    }

    const obj: { [key: string]: any } = {
      rootDirHandle,
    };

    return obj;
  }

  protected async _getFs(wsName: string, opts: StorageOpts) {
    const rootDirHandle: FileSystemDirectoryHandle = (
      await opts.readWorkspaceMetadata(wsName)
    ).rootDirHandle;

    return new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: ({ name }) => allowedFile(name),
    });
  }
}
