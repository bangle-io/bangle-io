import { WorkspaceType } from '@bangle.io/constants';
import { FileStorageIndexedDB } from '@bangle.io/file-storage-indexeddb';
import {
  BaseAppDatabase,
  BaseFileStorageProvider,
} from '@bangle.io/shared-types';
import { validateNoteWsPath } from '@bangle.io/ws-path';

export class Workspace {
  private provider: BaseFileStorageProvider;

  constructor(
    private config: {
      wsName: string;
      wsType: WorkspaceType;
      database: BaseAppDatabase;
    },
  ) {
    if (config.wsType === WorkspaceType.Browser) {
      this.provider = new FileStorageIndexedDB();
    } else {
      throw new Error(`Workspace type ${config.wsType} not supported`);
    }
  }

  async init(): Promise<boolean> {
    return true;
  }

  async createNote(wsPath: string): Promise<boolean> {
    validateNoteWsPath(wsPath);

    throw new Error(`not implemented`);
  }

  // async createFile(wsPath: string, file: File): Promise<boolean> {}
}
