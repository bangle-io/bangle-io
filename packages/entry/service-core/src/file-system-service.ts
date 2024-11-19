import { readFileAsText } from '@bangle.io/baby-fs';
import {
  BaseService,
  type FileStorageService,
  type Logger,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  VALID_NOTE_EXTENSIONS_SET,
  getExtension,
  isValidFileWsPath,
  isValidNoteWsPath,
  resolvePath,
  validateFileWsPath,
} from '@bangle.io/ws-path';

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
      payload: { oldWsPath: string; newWsPath: string };
    };

export class FileSystemService extends BaseService {
  private fileStorageService: FileStorageService;

  constructor(
    logger: Logger,
    dependencies: {
      fileStorageService: FileStorageService;
    },
    private onChange: (change: ChangeEvent) => void,
  ) {
    super('file', 'core', logger, dependencies);
    this.fileStorageService = dependencies.fileStorageService;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing file service');
  }

  isFileTypeSupported({ extension }: { extension: string }) {
    // TODO: we are only doing notes for now, need to expand
    return VALID_NOTE_EXTENSIONS_SET.has(extension);
  }

  async listFiles(
    wsName: string,
    abortSignal: AbortSignal = new AbortController().signal,
  ): Promise<string[]> {
    await this.initialized;
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
    await this.initialized;
    validateFileWsPath(wsPath);

    const file = await this.fileStorageService.readFile(wsPath, {});

    return file;
  }

  async readFileAsText(wsPath: string): Promise<string | undefined> {
    await this.initialized;
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
    await this.initialized;
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
    await this.initialized;
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
    await this.initialized;
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
    await this.initialized;
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
      payload: { oldWsPath, newWsPath },
    });
  }
}
