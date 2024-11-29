import { readFileAsText } from '@bangle.io/baby-fs';
import {
  BaseService,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type {
  BaseFileStorageService,
  BaseServiceCommonOptions,
  RootEmitter,
} from '@bangle.io/types';
import {
  VALID_NOTE_EXTENSIONS_SET,
  getExtension,
  isValidFileWsPath,
  isValidNoteWsPath,
  resolvePath,
  validateFileWsPath,
} from '@bangle.io/ws-path';
import { atom } from 'jotai';

type ChangeEvent =
  | {
      type: 'file-create';
      payload: { wsPath: string };
    }
  | {
      type: 'file-update';
      payload: { wsPath: string };
    }
  | {
      type: 'file-delete';
      payload: { wsPath: string };
    }
  | {
      type: 'file-rename';
      payload: { oldWsPath?: string; wsPath: string };
    };

export class FileSystemService extends BaseService {
  private fileStorageService: BaseFileStorageService;

  $fileChanged = atom(0);

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      fileStorageService: BaseFileStorageService;
    },
    private rootEmitter: RootEmitter,
  ) {
    super({
      ...baseOptions,
      name: 'file-system-service',
      kind: 'core',
      dependencies,
    });
    this.fileStorageService = dependencies.fileStorageService;
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {}

  isFileTypeSupported({ extension }: { extension: string }) {
    // TODO: we are only doing notes for now, need to expand
    return VALID_NOTE_EXTENSIONS_SET.has(extension);
  }

  private onChange(change: ChangeEvent) {
    this.store.set(this.$fileChanged, (v) => v + 1);
    this.rootEmitter.emit('event::file:update', {
      type: change.type,
      wsPath: change.payload.wsPath,
      oldWsPath:
        change.type === 'file-rename' ? change.payload.oldWsPath : undefined,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }

  async listFiles(
    wsName: string,
    abortSignal: AbortSignal = new AbortController().signal,
  ): Promise<string[]> {
    await this.initializedPromise;

    let wsPaths = await this.fileStorageService.listAllFiles(
      wsName,
      abortSignal,
      {},
    );

    wsPaths = wsPaths.filter((r) => {
      const isValid = isValidFileWsPath(r);
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
    validateFileWsPath(wsPath);

    const file = await this.fileStorageService.readFile(wsPath, {});

    return file;
  }

  async readFileAsText(wsPath: string): Promise<string | undefined> {
    await this.initializedPromise;
    if (!isValidNoteWsPath(wsPath)) {
      throwAppError('error::file:invalid-note-path', 'Invalid note file path', {
        invalidWsPath: wsPath,
      });
    }

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
    validateFileWsPath(wsPath);

    await this.fileStorageService.createFile(wsPath, file, {});
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
    validateFileWsPath(wsPath);

    await this.fileStorageService.writeFile(wsPath, file, {
      sha: options.sha,
    });
    this.onChange({
      type: 'file-update',
      payload: { wsPath },
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.initializedPromise;
    validateFileWsPath(wsPath);

    await this.fileStorageService.deleteFile(wsPath, {});
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
    validateFileWsPath(oldWsPath);
    validateFileWsPath(newWsPath);

    const { wsName: currentWsName } = resolvePath(oldWsPath);
    const { wsName: newWsName } = resolvePath(newWsPath);

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

    await this.fileStorageService.renameFile(oldWsPath, {
      newWsPath,
    });
    this.onChange({
      type: 'file-rename',
      payload: { oldWsPath, wsPath: newWsPath },
    });
  }
}
