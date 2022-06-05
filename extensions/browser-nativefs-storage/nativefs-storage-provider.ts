import { wsPathHelpers } from '@bangle.io/api';
import { resolvePath } from '@bangle.io/api/ws-path-helpers';
import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  NativeBrowserFileSystem,
} from '@bangle.io/baby-fs';
import { WorkspaceTypeNative } from '@bangle.io/constants';
import { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { assertSignal } from '@bangle.io/utils';

const allowedFile = (name: string) => {
  return name.endsWith('.md') || name.endsWith('.png');
};

export class NativsFsStorageProvider implements BaseStorageProvider {
  name = WorkspaceTypeNative;
  displayName = 'File system storage';
  description = 'Saves data in your file system';

  async createFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    await this.writeFile(wsPath, file, opts);
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    const { wsName } = resolvePath(wsPath);

    await this._getFs(wsName, opts).unlink(wsPathHelpers.toFSPath(wsPath));
  }

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    const path = wsPathHelpers.toFSPath(wsPath);
    const { wsName } = resolvePath(wsPath);

    try {
      await this._getFs(wsName, opts).stat(path);

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
    const path = wsPathHelpers.toFSPath(wsPath);
    const { wsName } = resolvePath(wsPath);

    const stat = await this._getFs(wsName, opts).stat(path);

    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = await this._getFs(wsName, opts).opendirRecursive(
      wsName,
    );

    assertSignal(abortSignal);

    files = rawPaths
      .map((r) => {
        const wsPath = wsPathHelpers.fromFsPath(r);

        return wsPath;
      })
      .filter((r): r is string => Boolean(r));

    const result = files.sort((a, b) => a.localeCompare(b));

    return result;
  }

  async newWorkspaceMetadata(wsName: string, createOpts: any) {
    const { rootDirHandle } = createOpts;

    if (!rootDirHandle) {
      throw new Error(
        `rootDirHandle is necessary for creating nativefs workspace`,
      );
    }

    return {
      rootDirHandle,
    };
  }

  async readFile(wsPath: string, opts: StorageOpts): Promise<File | undefined> {
    if (!(await this.fileExists(wsPath, opts))) {
      return undefined;
    }

    const { wsName } = resolvePath(wsPath);

    return this._getFs(wsName, opts).readFile(wsPathHelpers.toFSPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    const { wsName } = resolvePath(wsPath);

    await this._getFs(wsName, opts).rename(
      wsPathHelpers.toFSPath(wsPath),
      wsPathHelpers.toFSPath(newWsPath),
    );
  }

  async writeFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    const path = wsPathHelpers.toFSPath(wsPath);
    const { wsName } = resolvePath(wsPath);

    await this._getFs(wsName, opts).writeFile(path, file);
  }

  private _getFs(wsName: string, opts: StorageOpts) {
    const rootDirHandle: FileSystemDirectoryHandle =
      opts.readWorkspaceMetadata(wsName).rootDirHandle;

    return new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: (fileHandle: FileSystemFileHandle) =>
        allowedFile(fileHandle.name),
    });
  }
}
