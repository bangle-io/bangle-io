import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  hasPermission,
  NativeBrowserFileSystem,
} from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  FileStorageOpts,
} from '@bangle.io/shared-types';
import { fromFsPath, getExtension, toFSPath } from '@bangle.io/ws-path';

function assertRootDirHandle(
  rootDirHandle: any,
): rootDirHandle is FileSystemHandle {
  if (!rootDirHandle) {
    throw new Error(
      `rootDirHandle is necessary for creating nativefs workspace`,
    );
  }
  return rootDirHandle;
}

// TODO: watch for changes in the other tabs and emit events
export class FileStorageNativeFS implements BaseFileStorageProvider {
  // setting it to string for easier subclassing while testing
  name: string = WorkspaceType.NativeFS;
  displayName = 'Local File Storage';
  description = 'Saves data in your local file system storage';

  private options!: FileStorageOpts;

  private _fs: NativeBrowserFileSystem | undefined;

  protected async getFs(): Promise<NativeBrowserFileSystem> {
    if (!this._fs) {
      const rootDirHandle = (await this.options.getWorkspaceMetadata())
        .rootDirHandle;

      assertRootDirHandle(rootDirHandle);

      const fs = new NativeBrowserFileSystem({
        rootDirHandle: rootDirHandle,
        allowedFile: ({ name }) =>
          this.options.isFileTypeSupported({
            extension: getExtension(name) ?? '',
          }),
      });
      this._fs = fs;
      return fs;
    }

    return this._fs;
  }

  async onInit(options: FileStorageOpts) {
    const { rootDirHandle } = options.initialMetadata;

    assertRootDirHandle(rootDirHandle);

    if (!(await hasPermission(rootDirHandle))) {
      throw new Error(
        `Cannot create workspace with rootDirHandle ${rootDirHandle.name} without permission`,
      );
    }

    this.options = options;
  }

  destroy() {
    // no-op
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    const path = toFSPath(wsPath);
    await (await this.getFs()).writeFile(path, file);

    this.options.onChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    const path = toFSPath(wsPath);

    await (await this.getFs()).unlink(path);

    this.options.onChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    const path = toFSPath(wsPath);
    try {
      await (await this.getFs()).stat(path);
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

    const stat = await (await this.getFs()).stat(path);

    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }

  isSupported() {
    // TODO: we donot have a great way to check if native fs is supported
    // in the worker thread. We need have a universal configuration that is passed to worker
    // and main thread on initialization.
    return true;
  }

  async listAllFiles(abortSignal: AbortSignal): Promise<string[]> {
    let files: string[] = [];

    const rawPaths: string[] = await (
      await this.getFs()
    ).opendirRecursive(this.options.wsName);

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

  async readFile(wsPath: string): Promise<File | undefined> {
    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }

    return await (await this.getFs()).readFile(toFSPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    {
      newWsPath,
    }: {
      newWsPath: string;
    },
  ): Promise<void> {
    await (await this.getFs()).rename(toFSPath(wsPath), toFSPath(newWsPath));

    this.options.onChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    if (!(await this.fileExists(wsPath))) {
      throw new Error(`Cannot write! File ${wsPath} does not exist`);
    }

    const path = toFSPath(wsPath);

    await (await this.getFs()).writeFile(path, file);

    this.options.onChange({
      type: 'update',
      wsPath,
    });
  }
}
