import {
  BaseService,
  type BaseServiceContext,
  throwAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME, WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';

type Config = {
  baseUrl?: string;
  onChange: (event: FileStorageChangeEvent) => void;
};

type HttpError = Error & { status?: number };

type JsonResponse<T> = {
  ok: boolean;
  value: T;
};

function toHttpError(message: string, status?: number): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

export class FileStorageServerFs
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.PrivateFS;
  public readonly displayName = 'Server Filesystem';
  public readonly description =
    'Saves workspace data on server-backed filesystem storage';

  private baseUrl: string;
  private onChange: (event: FileStorageChangeEvent) => void;

  constructor(context: BaseServiceContext, dependencies: null, config: Config) {
    super(SERVICE_NAME.fileStorageServerFsService, context, dependencies);
    this.baseUrl = config.baseUrl ?? '/api/server-fs';
    this.onChange = config.onChange;
  }

  async hookMount(): Promise<void> {}

  private emitChange(event: FileStorageChangeEvent) {
    this.onChange(event);
  }

  private toWsPath(wsPath: string) {
    const parsed = WsPath.safeParse(wsPath);
    if (!parsed.ok || !parsed.data) {
      throwAppError(
        'error::ws-path:invalid-ws-path',
        'Invalid workspace path',
        { invalidPath: wsPath },
      );
    }
    const parsedWsPath = parsed.data;
    if (!parsedWsPath.asFile()) {
      throwAppError(
        'error::ws-path:invalid-ws-path',
        'Invalid workspace path',
        { invalidPath: wsPath },
      );
    }

    return parsedWsPath.wsPath;
  }

  private async requestJson<T>(
    input: string,
    init?: RequestInit,
  ): Promise<JsonResponse<T>> {
    const response = await fetch(input, init);
    if (!response.ok) {
      const body = await response.text();
      throw toHttpError(body || `HTTP ${response.status}`, response.status);
    }
    return response.json() as Promise<JsonResponse<T>>;
  }

  private getFileUrl(wsPath: string, mode?: 'create' | 'update') {
    const query = new URLSearchParams({ wsPath: this.toWsPath(wsPath) });
    if (mode) {
      query.set('mode', mode);
    }
    return `${this.baseUrl}/file?${query.toString()}`;
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;

    const response = await fetch(this.getFileUrl(wsPath, 'create'), {
      method: 'PUT',
      body: await file.arrayBuffer(),
      headers: {
        'content-type': file.type || 'application/octet-stream',
      },
    });
    if (!response.ok) {
      throw toHttpError(await response.text(), response.status);
    }

    this.emitChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;

    const response = await fetch(this.getFileUrl(wsPath), { method: 'DELETE' });
    if (!response.ok) {
      throw toHttpError(await response.text(), response.status);
    }

    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    const result = await this.requestJson<boolean>(
      `${this.baseUrl}/exists?${new URLSearchParams({
        wsPath: this.toWsPath(wsPath),
      }).toString()}`,
    );
    return result.value;
  }

  async fileStat(wsPath: string) {
    await this.mountPromise;
    const result = await this.requestJson<{ ctime: number; mtime: number }>(
      `${this.baseUrl}/stat?${new URLSearchParams({
        wsPath: this.toWsPath(wsPath),
      }).toString()}`,
    );
    return result.value;
  }

  async isSupported() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.mountPromise;
    const result = await this.requestJson<string[]>(
      `${this.baseUrl}/list?${new URLSearchParams({ wsName }).toString()}`,
      {
        signal: abortSignal,
      },
    );
    abortSignal.throwIfAborted();

    return result.value.sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;

    const response = await fetch(this.getFileUrl(wsPath));
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw toHttpError(await response.text(), response.status);
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const fileName =
      response.headers.get('x-file-name') ||
      WsPath.fromString(wsPath).asFile()?.fileName ||
      'file';
    const lastModified = Number(response.headers.get('x-last-modified')) || 0;
    const blob = await response.blob();

    return new File([blob], fileName, {
      type: contentType,
      lastModified,
    });
  }

  async renameFile(
    wsPath: string,
    { newWsPath }: { newWsPath: string },
  ): Promise<void> {
    await this.mountPromise;

    await this.requestJson<null>(`${this.baseUrl}/rename`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        wsPath: this.toWsPath(wsPath),
        newWsPath: this.toWsPath(newWsPath),
      }),
    });

    this.emitChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;

    const response = await fetch(this.getFileUrl(wsPath, 'update'), {
      method: 'PUT',
      body: await file.arrayBuffer(),
      headers: {
        'content-type': file.type || 'application/octet-stream',
      },
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      if (response.status === 404) {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'Cannot write file as it does not exist',
          {
            wsPath,
            storage: this.name,
          },
        );
      }
      throw toHttpError(errorMessage, response.status);
    }

    this.emitChange({
      type: 'update',
      wsPath,
    });
  }
}
