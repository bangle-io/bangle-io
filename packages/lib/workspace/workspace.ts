import { WorkspaceType } from '@bangle.io/constants';
import { FileStorageIndexedDB } from '@bangle.io/file-storage-indexeddb';
import { AppDatabase, BaseFileStorageProvider } from '@bangle.io/shared-types';
import {
  getExtension,
  isValidFileWsPath,
  VALID_NOTE_EXTENSIONS_SET,
  validateFileWsPath,
} from '@bangle.io/ws-path';

import { logger } from './logger';

type Config = {
  readonly wsName: string;
  readonly database: AppDatabase;
};

export class Workspace {
  private provider!: BaseFileStorageProvider;

  static async create(config: Config): Promise<Workspace> {
    const ws = new Workspace(config);

    await ws.init();

    return ws;
  }

  private constructor(private config: Config) {}

  async init() {
    const info = await this.config.database.getWorkspaceInfo(
      this.config.wsName,
    );

    if (!info) {
      throw new Error(`Workspace ${this.config.wsName} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (info?.type === WorkspaceType.Browser) {
      this.provider = new FileStorageIndexedDB();
    } else {
      throw new Error(`Workspace type ${info?.type} not supported`);
    }

    await this.provider.onInit({
      wsName: this.config.wsName,

      onChange: (event) => {
        // TODO cross tab sync
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
      this.config.wsName,
    );
    return metadata ?? {};
  }

  async updateWorkspaceMetadata(
    metadata:
      | Record<string, any>
      | ((existingMetadata: Record<string, any>) => Record<string, any>),
  ): Promise<void> {
    await this.config.database.updateWorkspaceMetadata(
      this.config.wsName,
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
}
