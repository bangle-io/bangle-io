import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  NativeBrowserFileSystem,
} from '@bangle.io/baby-fs';
import { WorkspaceTypeNative } from '@bangle.io/constants';
import { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { assertSignal } from '@bangle.io/utils';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

const allowedFile = (name: string) => {
  return name.endsWith('.md') || name.endsWith('.png');
};

export class NativsFsStorageProvider implements BaseStorageProvider {
  name = WorkspaceTypeNative;
  displayName = 'File system storage';
  description = 'Saves data in your file system';

  private getFs(opts: StorageOpts) {
    const rootDirHandle: FileSystemDirectoryHandle =
      opts.readWorkspaceMetadata().rootDirHandle;

    return new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: (fileHandle: FileSystemFileHandle) =>
        allowedFile(fileHandle.name),
    });
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

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    const path = toFSPath(wsPath);
    try {
      await this.getFs(opts).stat(path);
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
    const stat = await this.getFs(opts).stat(path);
    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    await this.getFs(opts).unlink(toFSPath(wsPath));
  }

  async getFile(wsPath: string, opts: StorageOpts): Promise<File> {
    return this.getFs(opts).readFile(toFSPath(wsPath));
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = await this.getFs(opts).opendirRecursive(wsName);

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

  async saveFile(wsPath: string, file: File, opts: StorageOpts): Promise<void> {
    const path = toFSPath(wsPath);
    await this.getFs(opts).writeFile(path, file);
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    await this.getFs(opts).rename(toFSPath(wsPath), toFSPath(newWsPath));
  }
}
