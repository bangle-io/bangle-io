import { AppDatabase } from '@bangle.io/app-database';
import type { DiscriminatedUnionToObject, Emitter } from '@bangle.io/emitter';
import type { UserPreferenceManager } from '@bangle.io/user-preference';

import { DebugFlags } from './debug-flags';
import { WorkspaceInfo } from './workspace';

export type EternalVarsEvent =
  | {
      event: '@event::database:workspace-create';
      payload: WorkspaceInfo;
    }
  | {
      event: '@event::database:workspace-update';
      payload: { name: string };
    }
  | {
      event: '@event::database:workspace-delete';
      payload: {
        name: string;
      };
    }
  | {
      event: '@event::user-preference:change';
      payload: undefined;
    };

export interface EternalVarsBase {
  debugFlags: DebugFlags;
  appDatabase: AppDatabase;
  emitter: Emitter<DiscriminatedUnionToObject<EternalVarsEvent>>;
  userPreferenceManager: UserPreferenceManager;
}
