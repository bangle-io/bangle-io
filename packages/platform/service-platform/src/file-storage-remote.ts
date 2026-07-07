import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from '@bangle.io/baby-fs';
import {
  BaseService,
  type BaseServiceContext,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  FILE_STORAGE_MAX_FILE_SIZE_BYTES,
  SERVICE_NAME,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import {
  isRemoteFileError,
  isRemoteFileErrorCode,
  type RemoteFileStorageClient,
} from '@bangle.io/remote-file-sync';
import type {
  BaseFileStorageProvider,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { toFSPathOrThrow, WsPath } from '@bangle.io/ws-path';

type Config = {
  onChange: (event: FileStorageChangeEvent) => void;
  /**
   * Resolves the API client for a workspace. The composition root reads the
   * workspace's stored server URL + token and returns an HTTP (or IPC) client
   * bound to that endpoint — mirroring how NativeFS resolves a directory handle.
   */
  getClient: (
    wsName: string,
  ) => RemoteFileStorageClient | Promise<RemoteFileStorageClient>;
};

/**
 * A file-storage provider backed by a remote HTTP server that implements the
 * Bangle.io remote file API (see `@bangle.io/remote-file-sync`). This powers
 * bring-your-own-server workspaces, the bundled/Docker deployment, and the
 * Electron desktop backend (via an IPC client), all through one contract.
 *
 * Failure handling is deliberate: a network/permission failure never resolves
 * to empty content or a false success. Reads of a missing file resolve to
 * `undefined`; every transport failure surfaces as a typed app error.
 */
export class FileStorageRemote
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.Remote;
  public readonly displayName = 'Remote Server';
  public readonly description = 'Syncs notes with your own file server';
  public readonly maxFileSizeBytes = FILE_STORAGE_MAX_FILE_SIZE_BYTES.remote;

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: Config,
  ) {
    super(SERVICE_NAME.fileStorageRemoteService, context, dependencies);
  }

  async hookMount(): Promise<void> {}

  isSupported() {
    return true;
  }

  private emitChange(event: FileStorageChangeEvent) {
    this.config.onChange(event);
  }

  private wsNameOf(wsPath: string): string {
    return WsPath.fromString(wsPath).wsName;
  }

  // Resolve the client on every call rather than caching it: the composition
  // root builds it from workspace metadata (a cheap in-memory lookup), so a
  // changed server URL/token takes effect immediately with no stale binding.
  private async getClientFor(wsName: string): Promise<RemoteFileStorageClient> {
    return this.config.getClient(wsName);
  }

  /** Wraps any transport-level failure into a typed, user-surfaceable error. */
  private failRequest(error: unknown, wsName: string): never {
    if (isRemoteFileError(error)) {
      throwAppError(
        'error::remote-storage:request-failed',
        error.message || 'Remote file request failed',
        { wsName, code: error.code, reason: error.message || error.code },
      );
    }
    throw error;
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const wsName = this.wsNameOf(wsPath);
    const fsPath = toFSPathOrThrow(wsPath);
    const client = await this.getClientFor(wsName);
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      await client.create(fsPath, bytes);
    } catch (error) {
      if (isRemoteFileErrorCode(error, 'already-exists')) {
        throwAppError('error::file:already-existing', 'File already exists', {
          wsPath,
        });
      }
      this.failRequest(error, wsName);
    }
    this.emitChange({ type: 'create', wsPath });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const wsName = this.wsNameOf(wsPath);
    const fsPath = toFSPathOrThrow(wsPath);
    const client = await this.getClientFor(wsName);
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      await client.write(fsPath, bytes);
    } catch (error) {
      if (isRemoteFileErrorCode(error, 'not-found')) {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'Cannot write to file because it does not exist',
          { wsPath, storage: this.name },
        );
      }
      this.failRequest(error, wsName);
    }
    this.emitChange({ type: 'update', wsPath });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    const wsName = this.wsNameOf(wsPath);
    const fsPath = toFSPathOrThrow(wsPath);
    const client = await this.getClientFor(wsName);
    try {
      await client.delete(fsPath);
    } catch (error) {
      if (isRemoteFileErrorCode(error, 'not-found')) {
        throw new BaseFileSystemError({
          message: 'File not found',
          code: FILE_NOT_FOUND_ERROR,
        });
      }
      this.failRequest(error, wsName);
    }
    this.emitChange({ type: 'delete', wsPath });
  }

  async renameFile(
    wsPath: string,
    { newWsPath }: { newWsPath: string },
  ): Promise<void> {
    await this.mountPromise;
    const wsName = this.wsNameOf(wsPath);
    const client = await this.getClientFor(wsName);
    try {
      await client.rename(toFSPathOrThrow(wsPath), toFSPathOrThrow(newWsPath));
    } catch (error) {
      if (isRemoteFileErrorCode(error, 'not-found')) {
        throw new BaseFileSystemError({
          message: 'File not found',
          code: FILE_NOT_FOUND_ERROR,
        });
      }
      this.failRequest(error, wsName);
    }
    this.emitChange({ type: 'rename', oldWsPath: wsPath, newWsPath });
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;
    const wsName = this.wsNameOf(wsPath);
    const fsPath = toFSPathOrThrow(wsPath);
    const client = await this.getClientFor(wsName);
    try {
      const result = await client.read(fsPath);
      if (!result) {
        return undefined;
      }
      const fileName = fsPath.split('/').pop() ?? 'file';
      // Wrap the bytes in a Blob so the File carries a Blob part (portable
      // across browsers and the test File shim); derive the MIME type from the
      // extension so image/asset consumers get a usable `type` (parity with the
      // memory and native providers).
      return new File([new Blob([result.bytes as BlobPart])], fileName, {
        lastModified: result.stat.mtime,
        type: mimeFromName(fileName),
      });
    } catch (error) {
      return this.failRequest(error, wsName);
    }
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    const wsName = this.wsNameOf(wsPath);
    const fsPath = toFSPathOrThrow(wsPath);
    const client = await this.getClientFor(wsName);
    try {
      return await client.exists(fsPath);
    } catch (error) {
      return this.failRequest(error, wsName);
    }
  }

  async fileStat(wsPath: string) {
    await this.mountPromise;
    const wsName = this.wsNameOf(wsPath);
    const fsPath = toFSPathOrThrow(wsPath);
    const client = await this.getClientFor(wsName);
    let stat: Awaited<ReturnType<RemoteFileStorageClient['stat']>>;
    try {
      stat = await client.stat(fsPath);
    } catch (error) {
      return this.failRequest(error, wsName);
    }
    if (!stat) {
      throw new BaseFileSystemError({
        message: 'File not found',
        code: FILE_NOT_FOUND_ERROR,
      });
    }
    return { ctime: stat.ctime, mtime: stat.mtime };
  }

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.mountPromise;
    const client = await this.getClientFor(wsName);
    let fsPaths: string[];
    try {
      fsPaths = await client.list(wsName, abortSignal);
    } catch (error) {
      return this.failRequest(error, wsName);
    }
    abortSignal.throwIfAborted();
    return (
      fsPaths
        .map((fsPath) => WsPath.fromFSPath(fsPath))
        .filter((r) => !!r)
        // Never surface paths from another workspace, even if the server returns
        // them — the listing must reflect only the requested workspace.
        .filter((r) => r.wsName === wsName)
        .map((r) => r.wsPath)
        .sort((a, b) => a.localeCompare(b))
    );
  }
}

const MIME_BY_EXT: Record<string, string> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
};

function mimeFromName(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  return (ext && MIME_BY_EXT[ext]) || '';
}
