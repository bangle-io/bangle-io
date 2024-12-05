import { readFileAsText } from '@bangle.io/baby-fs';
import {
  BaseError,
  BaseService,
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  WORKSPACE_STORAGE_TYPE,
  type WorkspaceStorageType,
} from '@bangle.io/constants';
import type {
  BaseFileStorageService,
  BaseServiceCommonOptions,
  ScopedEmitter,
  WorkspaceInfo,
} from '@bangle.io/types';
import {
  VALID_NOTE_EXTENSIONS_SET,
  assertSplitWsPath,
  getExtension,
  validateWsPath,
} from '@bangle.io/ws-path';
import { assertValidNoteWsPath, assertedGetWsName } from '@bangle.io/ws-path';
import { atom } from 'jotai';

type ChangeEvent = {
  type: 'file-create' | 'file-content-update' | 'file-delete' | 'file-rename';
  payload: { oldWsPath?: string; wsPath: string };
};

export class FileSystemService extends BaseService<{
  getWorkspaceInfo: ({ wsName }: { wsName: string }) => Promise<WorkspaceInfo>;
}> {
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
    baseOptions: BaseServiceCommonOptions,
    dependencies: Record<string, BaseService>,
    private options: {
      emitter: ScopedEmitter<'event::file:update'>;
      fileStorageServices: Record<string, BaseFileStorageService>;
    },
  ) {
    super({
      ...baseOptions,
      name: 'file-system-service',
      kind: 'core',
      dependencies,
      needsConfig: true,
    });

    const depSet = new Set(Object.values(dependencies));

    for (const [type, service] of Object.entries(
      this.options.fileStorageServices,
    )) {
      if (!depSet.has(service)) {
        throw new BaseError({
          message: `missing file storage ${type} in service dependency`,
        });
      }
    }
  }

  private async getStorageService(
    wsPathOrName: string,
  ): Promise<BaseFileStorageService> {
    const wsName = assertedGetWsName(wsPathOrName);
    const wsInfo = await this.config.getWorkspaceInfo({ wsName });
    const wsInfoType = wsInfo.type as WorkspaceStorageType;
    return FileSystemService._getStorageServiceForType(
      wsInfoType,
      this.options.fileStorageServices,
      wsName,
    );
  }

  protected async onInitialize(): Promise<void> {
    this.options.emitter.on(
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
          }
        }
      },
      this.abortSignal,
    );
  }

  protected async onDispose(): Promise<void> {}

  isFileTypeSupported({ extension }: { extension: string }) {
    return VALID_NOTE_EXTENSIONS_SET.has(extension);
  }

  private onChange(change: ChangeEvent) {
    this.options.emitter.emit('event::file:update', {
      type: change.type,
      ...change.payload,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }

  async listFiles(
    wsName: string,
    abortSignal: AbortSignal = new AbortController().signal,
  ): Promise<string[]> {
    await this.initializedPromise;
    // Using a dummy wsPath to get the storage service for the workspace
    const dummyWsPath = `${wsName}:dummy.md`;
    const storageService = await this.getStorageService(dummyWsPath);

    let wsPaths = await storageService.listAllFiles(wsName, abortSignal, {});

    wsPaths = wsPaths.filter((r) => {
      const { isValid } = validateWsPath(r);
      const extension = getExtension(r);
      const result =
        isValid && extension && this.isFileTypeSupported({ extension });

      if (!result) {
        this.logger.warn(
          `listFiles: Ignoring file "${r}" as it is not supported`,
        );
      }

      return result;
    });

    return wsPaths;
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.initializedPromise;
    assertSplitWsPath(wsPath);

    const storageService = await this.getStorageService(wsPath);
    const file = await storageService.readFile(wsPath, {});

    return file;
  }

  async readFileAsText(wsPath: string): Promise<string | undefined> {
    await this.initializedPromise;
    assertValidNoteWsPath(wsPath);

    const file = await this.readFile(wsPath);

    if (!file) {
      return undefined;
    }

    return readFileAsText(file);
  }

  async createFile(
    wsPath: string,
    file: File,
    _options: { sha?: string } = {},
  ): Promise<void> {
    await this.initializedPromise;
    assertSplitWsPath(wsPath);

    const storageService = await this.getStorageService(wsPath);
    await storageService.createFile(wsPath, file, {});
    this.onChange({
      type: 'file-create',
      payload: { wsPath },
    });
  }

  async writeFile(
    wsPath: string,
    file: File,
    options: { sha?: string } = {},
  ): Promise<void> {
    await this.initializedPromise;
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

  async deleteFile(wsPath: string): Promise<void> {
    await this.initializedPromise;
    assertSplitWsPath(wsPath);

    const storageService = await this.getStorageService(wsPath);
    await storageService.deleteFile(wsPath, {});
    this.onChange({
      type: 'file-delete',
      payload: { wsPath },
    });
  }

  async renameFile({
    oldWsPath,
    newWsPath,
  }: {
    oldWsPath: string;
    newWsPath: string;
  }): Promise<void> {
    await this.initializedPromise;

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
      // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
      case WORKSPACE_STORAGE_TYPE.Github: {
        throwAppError(
          'error::workspace:unknown-ws-type',
          `${wsInfoType} workspace is not supported for file operations`,
          { wsName, type: wsInfoType },
        );
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
}
