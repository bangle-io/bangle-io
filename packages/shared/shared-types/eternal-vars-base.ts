import { AppDatabase } from '@bangle.io/app-database';
import type { DiscriminatedUnionToObject, Emitter } from '@bangle.io/emitter';
import type { UserPreferenceManager } from '@bangle.io/user-preference';

import { DebugFlags } from './debug-flags';
import { WorkspaceInfo } from './workspace';

export type EternalVarsEventSourceInfo = {
  browsingContextId: string;
  timestamp: number;
};

// WARNING: only keep JSON serializable data in the payload
export type EternalVarsEvent =
  | {
      event: '@event::database:workspace-create';
      payload: { wsName: string; source: EternalVarsEventSourceInfo };
    }
  | {
      event: '@event::database:workspace-update';
      payload: { wsName: string; source: EternalVarsEventSourceInfo };
    }
  | {
      event: '@event::database:workspace-delete';
      payload: {
        wsName: string;
        source: EternalVarsEventSourceInfo;
      };
    }
  | {
      event: '@event::user-preference:change';
      payload: {
        source: EternalVarsEventSourceInfo;
      };
    }
  | {
      event: '@event::worker-sync:to-worker';
      payload: {
        counter: number;
        // we use naukar-state-sync to sync the state of the worker
        data: string;
      };
    }
  | {
      event: '@event::worker-sync:to-window';
      payload: {
        // we use naukar-state-sync to sync the state of the worker
        data: any;
      };
    };
export interface EternalVarsBase {
  debugFlags: DebugFlags;
  appDatabase: AppDatabase;
  emitter: Emitter<DiscriminatedUnionToObject<EternalVarsEvent>>;
  userPreferenceManager: UserPreferenceManager;
}
