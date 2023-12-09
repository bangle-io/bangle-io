import { APP_ERROR_NAME, throwAppError } from '@bangle.io/app-errors';
import { readFileAsText } from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import { FileStorageIndexedDB } from '@bangle.io/file-storage-indexeddb';
import { FileStorageNativeFS } from '@bangle.io/file-storage-nativefs';
import {
  AppDatabase,
  BaseFileStorageProvider,
  FileStorageChangeEvent,
} from '@bangle.io/shared-types';
import {
  getExtension,
  isValidFileWsPath,
  isValidNoteWsPath,
  resolvePath,
  VALID_NOTE_EXTENSIONS_SET,
  validateFileWsPath,
} from '@bangle.io/ws-path';

import { logger } from './logger';

export type Config = {
  readonly wsName: string;
  readonly database: AppDatabase;
  readonly onChange?: (event: FileStorageChangeEvent) => void;
};

export class Workspace {
  private provider!: BaseFileStorageProvider;
  destroyed = false;

  get wsName() {
    return this.config.wsName;
  }

  destroy() {
    this.destroyed = true;
    this.provider.destroy();
  }

  static async create(config: Config): Promise<Workspace> {
    const ws = new Workspace(config);

    await ws.init();

    return ws;
  }

  private constructor(private config: Config) {}

  async init() {
    const info = await this.config.database.getWorkspaceInfo(this.wsName);

    if (!info) {
      throwAppError(
        APP_ERROR_NAME.workspaceNotFound,
        `Workspace ${this.wsName} not found`,
        {
          wsName: this.wsName,
        },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (info?.type === WorkspaceType.Browser) {
      this.provider = new FileStorageIndexedDB();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    else if (info?.type === WorkspaceType.NativeFS) {
      this.provider = new FileStorageNativeFS();
    } else {
      throw new Error(`Workspace type ${info?.type} not implemented`);
    }

    if (!this.provider.isSupported()) {
      throw new Error(`Workspace type ${info?.type} not supported`);
    }

    await this.provider.onInit({
      wsName: this.wsName,
      initialMetadata: info.metadata,
      onChange: (event) => {
        if (this.destroyed) {
          return;
        }

        this.config.onChange?.(event);

        switch (event.type) {
          case 'create': {
            break;
          }
          case 'delete':
            break;
          case 'rename':
            break;
          case 'update':
            break;
        }
      },

      isFileTypeSupported: (options) => this.isFileTypeSupported(options),
      getWorkspaceMetadata: () => this.getWorkspaceMetadata(),
      updateWorkspaceMetadata: (metadata) =>
        this.updateWorkspaceMetadata(metadata),
    });
  }

  async getWorkspaceMetadata(): Promise<Record<string, any>> {
    const metadata = await this.config.database.getWorkspaceMetadata(
      this.wsName,
    );
    return metadata ?? {};
  }

  async updateWorkspaceMetadata(
    metadata:
      | Record<string, any>
      | ((existingMetadata: Record<string, any>) => Record<string, any>),
  ): Promise<void> {
    await this.config.database.updateWorkspaceMetadata(
      this.wsName,
      (existing) => {
        const result =
          typeof metadata === 'function' ? metadata(existing) : metadata;

        return result;
      },
    );
  }

  isFileTypeSupported({ extension }: { extension: string }) {
    // TODO: we are only doing notes for now, need to expand
    return VALID_NOTE_EXTENSIONS_SET.has(extension);
  }

  async listFiles(abortSignal: AbortSignal = new AbortController().signal) {
    let wsPaths = await this.provider.listAllFiles(abortSignal, {});

    wsPaths = wsPaths.filter((r) => {
      const isValid = isValidFileWsPath(r);
      const extension = getExtension(r);
      const result =
        isValid && extension && this.isFileTypeSupported({ extension });

      if (!result) {
        logger.warn(`listFiles: Ignoring file "${r}" as it is not supported`);
      }

      return result;
    });

    return wsPaths;
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    validateFileWsPath(wsPath);

    const file = await this.provider.readFile(wsPath, {});

    return file;
  }

  async readFileAsText(wsPath: string): Promise<string | undefined> {
    if (!isValidNoteWsPath(wsPath)) {
      throwAppError(
        APP_ERROR_NAME.fileStorageInvalidNotePath,
        `${wsPath} is not a valid note file path`,
        {
          invalidWsPath: wsPath,
        },
      );
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
    options: { sha?: string } = {},
  ): Promise<void> {
    validateFileWsPath(wsPath);

    await this.provider.createFile(wsPath, file, {});
  }

  async writeFile(
    wsPath: string,
    file: File,
    options: { sha?: string } = {},
  ): Promise<void> {
    validateFileWsPath(wsPath);

    await this.provider.writeFile(wsPath, file, {
      sha: options.sha,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    validateFileWsPath(wsPath);

    await this.provider.deleteFile(wsPath, {});
  }

  async renameFile({
    oldWsPath,
    newWsPath,
  }: {
    oldWsPath: string;
    newWsPath: string;
  }): Promise<void> {
    validateFileWsPath(oldWsPath);
    validateFileWsPath(newWsPath);

    const { wsName: currentWsName } = resolvePath(oldWsPath);
    const { wsName: newWsName } = resolvePath(newWsPath);

    if (currentWsName !== newWsName) {
      throwAppError(
        APP_ERROR_NAME.fileOpsNotAllowed,
        `Cannot rename file ${oldWsPath} to ${newWsPath} as they are in different workspaces`,
        {
          operation: 'rename',
        },
      );
    }

    await this.provider.renameFile(oldWsPath, {
      newWsPath,
    });
  }
}