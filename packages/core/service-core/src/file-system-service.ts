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
import {
  VALID_NOTE_EXTENSIONS_SET,
  assertSplitWsPath,
  assertedGetWsName,
  getExtension,
  validateWsPath,
} from '@bangle.io/ws-path';
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
    return VALID_NOTE_EXTENSIONS_SET.has(extension);
  }

  public async listFiles(
    wsName: string,
    abortSignal: AbortSignal = new AbortController().signal,
  ): Promise<string[]> {
    await this.mountPromise;
    // A dummy path is used to identify the correct storage service for this workspace.
    const dummyWsPath = `${wsName}:dummy.md`;
    const storageService = await this.getStorageService(dummyWsPath);

    let wsPaths = await storageService.listAllFiles(wsName, abortSignal, {});
    wsPaths = wsPaths.filter((r) => {
      const { isValid } = validateWsPath(r);
      const extension = getExtension(r);
      const isSupported =
        isValid && extension && this.isFileTypeSupported({ extension });

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
    assertSplitWsPath(wsPath);

    const storageService = await this.getStorageService(wsPath);
    const file = await storageService.readFile(wsPath, {});
    return file;
  }

  public async readFileAsText(wsPath: string): Promise<string | undefined> {
    await this.mountPromise;
    assertSplitWsPath(wsPath);

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
    assertSplitWsPath(wsPath);

    const storageService = await this.getStorageService(wsPath);
    await storageService.createFile(wsPath, file, {});
    this.onChange({
      type: 'file-create',
      payload: { wsPath },
    });
  }

  public async writeFile(
    wsPath: string,
    file: File,
    options: { sha?: string } = {},
  ): Promise<void> {
    await this.mountPromise;
    assertSplitWsPath(wsPath);

    const storageService = await this.getStorageService(wsPath);
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
    assertSplitWsPath(wsPath);

    const storageService = await this.getStorageService(wsPath);
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

    const { wsName: currentWsName } = assertSplitWsPath(oldWsPath);
    const { wsName: newWsName } = assertSplitWsPath(newWsPath);

    if (currentWsName !== newWsName) {
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

    const storageService = await this.getStorageService(oldWsPath);
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

  private async getStorageService(
    wsPathOrName: string,
  ): Promise<BaseFileStorageService> {
    await this.mountPromise;
    const wsName = assertedGetWsName(wsPathOrName);
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
