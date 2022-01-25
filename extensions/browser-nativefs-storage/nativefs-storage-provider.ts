import type { Node } from '@bangle.dev/pm';

import {
  BaseFileSystemError,
  DirTypeSystemHandle,
  FILE_NOT_FOUND_ERROR,
  FileTypeSystemHandle,
  NativeBrowserFileSystem,
  readFileAsText,
} from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { fromFsPath, resolvePath, toFSPath } from '@bangle.io/ws-path';

const allowedFile = (name: string) => {
  return name.endsWith('.md') || name.endsWith('.png');
};

export class NativsFsStorageProvider implements BaseStorageProvider {
  name = WorkspaceType.nativefs;
  displayName = 'File system storage';
  description = 'Saves data in your file system';

  private getFs(opts: StorageOpts) {
    const rootDirHandle: DirTypeSystemHandle =
      opts.readWorkspaceMetadata().rootDirHandle;

    return new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: (fileHandle: FileTypeSystemHandle) =>
        allowedFile(fileHandle.name),
    });
  }

  async fileToDoc(file: File, opts: StorageOpts): Promise<Node> {
    const textContent = await readFileAsText(file);
    const doc: Node = await opts.formatParser(textContent, opts.specRegistry);
    return doc;
  }

  async docToFile(
    doc: Node,
    fileName: string,
    opts: StorageOpts,
  ): Promise<File> {
    const data = await opts.formatSerializer(doc, opts.specRegistry);
    return new File([data], fileName, {
      type: 'text/plain',
    });
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

  async getDoc(wsPath: string, opts: StorageOpts): Promise<Node> {
    const file = await this.getFile(wsPath, opts);
    const doc = await this.fileToDoc(file, opts);

    return doc;
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

    if (abortSignal.aborted) {
      return [];
    }

    files = rawPaths
      .map((r) => {
        const wsPath = fromFsPath(r);
        return wsPath;
      })
      .filter((r): r is string => Boolean(r));

    const result = files.sort((a, b) => a.localeCompare(b));

    return result;
  }

  async saveDoc(wsPath: string, doc: Node, opts: StorageOpts): Promise<void> {
    const { fileName } = resolvePath(wsPath);

    const file = await this.docToFile(doc, fileName, opts);

    await this.saveFile(wsPath, file, opts);
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
