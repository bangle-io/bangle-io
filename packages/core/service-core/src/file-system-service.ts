import { readFileAsText } from '@bangle.io/baby-fs';
import {
  BaseService,
  type BaseServiceContext,
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  SERVICE_NAME,
  WORKSPACE_STORAGE_TYPE,
  type WorkspaceStorageType,
} from '@bangle.io/constants';
import type {
  BaseFileStorageService,
  ScopedEmitter,
  WorkspaceInfo,
} from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';
import { atom } from 'jotai';

type ChangeEvent = {
  type: 'file-create' | 'file-content-update' | 'file-delete' | 'file-rename';
  payload: { oldWsPath?: string; wsPath: string };
};

/**
 * Provides file system operations (list, read, write, rename, delete files)
 */
export class FileSystemService extends BaseService {
  static deps = [] as const;

  fileStorageServices!: Record<string, BaseFileStorageService>;
  getWorkspaceInfo!: ({ wsName }: { wsName: string }) => Promise<WorkspaceInfo>;

  $fileCreateCount = atom(0);
  $fileContentUpdateCount = atom(0);
  $fileDeleteCount = atom(0);
  $fileRenameCount = atom(0);

  $fileTreeChangeCount = atom((get) => {
    return (
      get(this.$fileCreateCount) +
      get(this.$fileDeleteCount) +
      get(this.$fileRenameCount)
    );
  });

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      emitter: ScopedEmitter<'event::file:update' | 'event::file:force-update'>;
    },
  ) {
    super(SERVICE_NAME.fileSystemService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    assertIsDefined(this.fileStorageServices, 'fileStorageServices');
    assertIsDefined(this.getWorkspaceInfo, 'getWorkspaceInfo');

    this.config.emitter.on(
      'event::file:force-update',
      () => {
        this.store.set(this.$fileCreateCount, (c) => c + 1);
        this.store.set(this.$fileContentUpdateCount, (c) => c + 1);
        this.store.set(this.$fileDeleteCount, (c) => c + 1);
        this.store.set(this.$fileRenameCount, (c) => c + 1);
      },
      this.abortSignal,
    );

    this.config.emitter.on(
      'event::file:update',
      (event) => {
        switch (event.type) {
          case 'file-create': {
            this.store.set(this.$fileCreateCount, (c) => c + 1);
            break;
          }
          case 'file-content-update': {
            this.store.set(this.$fileContentUpdateCount, (c) => c + 1);
            break;
          }
          case 'file-delete': {
            this.store.set(this.$fileDeleteCount, (c) => c + 1);
            break;
          }
          case 'file-rename': {
            this.store.set(this.$fileRenameCount, (c) => c + 1);
            break;
          }
          default: {
            const _exhaustiveCheck: never = event.type;
          }
        }
      },
      this.abortSignal,
    );
  }

  public isFileTypeSupported({ extension }: { extension: string }) {
    return WsPath.VALID_NOTE_EXTENSIONS_SET.has(extension);
  }

  public async listFiles(
    wsName: string,
    abortSignal: AbortSignal = new AbortController().signal,
  ): Promise<string[]> {
    await this.mountPromise;
    // A dummy path is used to identify the correct storage service for this workspace.
    const dummyWsPath = WsPath.fromParts(wsName, '').wsPath;
    const storageService = await this.getStorageService({
      wsPath: dummyWsPath,
    });

    let wsPaths = await storageService.listAllFiles(wsName, abortSignal, {});
    wsPaths = wsPaths.filter((r) => {
      const result = WsPath.safeParse(r);
      if (!result.ok) {
        this.logger.warn(
          `listFiles: Ignoring file "${r}" as it is not a valid wsPath`,
        );
        return false;
      }
      const wsPath = result.data;
      const filePath = wsPath?.asFile();
      if (!filePath) {
        this.logger.warn(
          `listFiles: Ignoring file "${r}" as it is not a file path`,
        );
        return false;
      }
      const extension = filePath.extension;
      const isSupported = extension
        ? this.isFileTypeSupported({ extension })
        : false;

      if (!isSupported) {
        this.logger.warn(
          `listFiles: Ignoring file "${r}" as it is not supported`,
        );
      }
      return isSupported;
    });

    return wsPaths;
  }

  public async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    const file = await storageService.readFile(wsPath, {});
    return file;
  }

  public async readFileAsText(wsPath: string): Promise<string | undefined> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const file = await this.readFile(wsPath);
    if (!file) {
      return undefined;
    }
    return readFileAsText(file);
  }

  public async createFile(
    wsPath: string,
    file: File,
    _options: { sha?: string } = {},
  ): Promise<void> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    await storageService.createFile(wsPath, file, {});
    this.onChange({
      type: 'file-create',
      payload: { wsPath },
    });
  }

  public async createTextFile(wsPath: string, text: string): Promise<void> {
    await this.mountPromise;
    const fileWsPath = WsPath.assertFile(wsPath);
    await this.createFile(
      wsPath,
      new File([text], fileWsPath.fileNameWithoutExtension, {
        type: 'text/plain',
      }),
    );
  }

  public async writeFile(
    wsPath: string,
    file: File,
    options: { sha?: string } = {},
  ): Promise<void> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    await storageService.writeFile(wsPath, file, {
      sha: options.sha,
    });
    this.onChange({
      type: 'file-content-update',
      payload: { wsPath },
    });
  }

  public async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    await storageService.deleteFile(wsPath, {});
    this.onChange({
      type: 'file-delete',
      payload: { wsPath },
    });
  }

  public async renameFile({
    oldWsPath,
    newWsPath,
  }: {
    oldWsPath: string;
    newWsPath: string;
  }): Promise<void> {
    await this.mountPromise;

    const oldPath = WsPath.fromString(oldWsPath).asFile();
    const newPath = WsPath.fromString(newWsPath).asFile();

    if (!oldPath || !newPath) {
      throwAppError(
        'error::file:invalid-operation',
        'Invalid file paths provided',
        {
          operation: 'rename',
          oldWsPath,
          newWsPath,
        },
      );
    }

    if (oldPath.wsName !== newPath.wsName) {
      throwAppError(
        'error::file:invalid-operation',
        'Cannot rename file across different workspaces',
        {
          operation: 'rename',
          oldWsPath,
          newWsPath,
        },
      );
    }

    const storageService = await this.getStorageService({
      wsPath: oldPath.wsPath,
    });
    await storageService.renameFile(oldWsPath, {
      newWsPath,
    });
    this.onChange({
      type: 'file-rename',
      payload: { oldWsPath, wsPath: newWsPath },
    });
  }

  static _getStorageServiceForType(
    wsInfoType: WorkspaceStorageType,
    fileStorageServices: Record<string, BaseFileStorageService>,
    wsName: string,
  ): BaseFileStorageService {
    const getDep = (type: WorkspaceStorageType): BaseFileStorageService => {
      const result = fileStorageServices[type];
      assertIsDefined(result);
      return result;
    };

    switch (wsInfoType) {
      case WORKSPACE_STORAGE_TYPE.Browser: {
        return getDep(WORKSPACE_STORAGE_TYPE.Browser);
      }
      case WORKSPACE_STORAGE_TYPE.NativeFS: {
        return getDep(WORKSPACE_STORAGE_TYPE.NativeFS);
      }
      case WORKSPACE_STORAGE_TYPE.Memory: {
        return getDep(WORKSPACE_STORAGE_TYPE.Memory);
      }
      case WORKSPACE_STORAGE_TYPE.Help:
      case WORKSPACE_STORAGE_TYPE.PrivateFS:
      case WORKSPACE_STORAGE_TYPE.Github: {
        throwAppError(
          'error::workspace:unknown-ws-type',
          `${wsInfoType} workspace is not supported for file operations`,
          { wsName, type: wsInfoType },
        );
        break;
      }
      default: {
        const _exhaustiveCheck: never = wsInfoType;
        throwAppError(
          'error::workspace:unknown-ws-type',
          `${wsInfoType} workspace is not supported for file operations`,
          { wsName, type: wsInfoType },
        );
      }
    }
  }

  private async getStorageService({
    wsPath,
  }: {
    wsPath: string;
  }): Promise<BaseFileStorageService> {
    await this.mountPromise;
    const wsName = WsPath.fromString(wsPath).wsName;
    const wsInfo = await this.getWorkspaceInfo({ wsName });
    const wsInfoType = wsInfo.type as WorkspaceStorageType;
    return FileSystemService._getStorageServiceForType(
      wsInfoType,
      this.fileStorageServices,
      wsName,
    );
  }

  private onChange(change: ChangeEvent) {
    this.config.emitter.emit('event::file:update', {
      type: change.type,
      ...change.payload,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }
}
