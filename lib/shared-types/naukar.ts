import type {
  naukarReplicaWorkspaceSchema,
  NaukarReplicaWorkspaceState,
} from '@bangle.io/constants';
import type { FzfResultItem } from '@bangle.io/fzf-search';
import type { z } from '@bangle.io/nsm-3';
import type { searchPmNode, SearchResultItem } from '@bangle.io/search-pm-node';
import type { BaseError } from '@bangle.io/utils';

import type { WsName, WsPath } from './workspace';
// NOTE: if browser does not support workers, naukar code will run in the
// the same process as the main thread and continue to communicate with
// serialization just like had it been a worker.

export type NaukarWorkerAPIInternal = NaukarWorkerAPI & {
  __internal_register_main_cb: (mainApi: NaukarMainAPI) => Promise<boolean>;
};

// Endpoints in naukar exposed to main thread
// this interface allows main thread to hit naukar
// Note: Keep API always 2 level nested only
export interface NaukarWorkerAPI {
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

    // TODO: lets move out of this way of doing things
    __signalWorkerToAbortMethod: (uid: string) => Promise<void>;
  };

  editor: {
    registerCollabMessagePort: (port: MessageChannel['port2']) => Promise<void>;
  };

  // ensure these methods are called in main thread's effect
  replicaSlices: {
    setReplicaWorkspaceState: (
      state: NaukarReplicaWorkspaceState,
    ) => Promise<void>;
  };

  test: {
    handlesBaseError: (error: BaseError) => Promise<boolean | BaseError>;
    isWorkerEnv: () => Promise<boolean>;
    requestDeleteCollabInstance: (wsPath: string) => Promise<void>;
    status: () => Promise<boolean>;
    throwCallbackError: () => Promise<void>;
    throwError: () => Promise<void>;
  };

  workspace: {};
}

// Endpoints in main exposed for naukar
// this allows naukar to hit main.
// Note: Keep API always 2 level nested only
export interface NaukarMainAPI {
  application: {
    onError: (error: Error) => Promise<void>;
  };

  // interface for updating counterparts to replica slices in main
  // to read the implementation of each method in main, see 'app/bangle-store'
  replicaSlices: {
    replicaWorkspaceUpdateFileShaEntry: (
      obj: z.infer<(typeof naukarReplicaWorkspaceSchema)['updateFileShaEntry']>,
    ) => Promise<void>;
    refreshWorkspace: () => Promise<void>;
  };
}
