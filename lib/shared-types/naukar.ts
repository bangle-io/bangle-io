import type { FzfResultItem } from '@bangle.io/fzf-search';
import type { searchPmNode, SearchResultItem } from '@bangle.io/search-pm-node';
import type { BaseError } from '@bangle.io/utils';

import type { WsName, WsPath } from './workspace';
// NOTE: if browser does not support workers, naukar code will run in the
// the same process as the main thread and continue to communicate with
// serialization just like had it been a worker.

// Endpoints in naukar exposed to main thread
export interface NaukarWorkerAPI {
  test: {
    handlesBaseError: (error: BaseError) => Promise<boolean | BaseError>;
    isWorkerEnv: () => Promise<boolean>;
    requestDeleteCollabInstance: (wsPath: string) => Promise<void>;
    status: () => Promise<boolean>;
    throwCallbackError: () => Promise<void>;
    throwError: () => Promise<void>;
  };

  editor: {
    registerCollabMessagePort: (port: MessageChannel['port2']) => Promise<void>;
  };

  workspace: {};

  abortable: {
    abortableSearchWsForPmNode: (
      abortSignal: AbortSignal,
      wsName: WsName,
      query: string,
      atomSearchTypes: Parameters<typeof searchPmNode>[4],
      opts?: Parameters<typeof searchPmNode>[5],
    ) => Promise<SearchResultItem[]>;

    abortableFzfSearchNoteWsPaths: (
      abortSignal: AbortSignal,
      wsName: WsName,
      query: string,
      limit?: number,
    ) => Promise<Array<FzfResultItem<WsPath>>>;

    abortableBackupAllFiles: (
      abortSignal: AbortSignal,
      wsName: WsName,
    ) => Promise<File>;

    abortableReadAllFilesBackup: (
      abortSignal: AbortSignal,
      backupFile: File,
    ) => Promise<File[]>;

    abortableCreateWorkspaceFromBackup: (
      abortSignal: AbortSignal,
      wsName: WsName,
      backupFile: File,
    ) => Promise<void>;
  };
}

// Endpoints in main exposed to naukar
export interface NaukarMainAPI {
  onBaseError: (error: BaseError) => Promise<void>;
}
