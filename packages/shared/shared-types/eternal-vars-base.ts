import { AppDatabase } from '@bangle.io/app-database';
import type { DiscriminatedUnionToObject, Emitter } from '@bangle.io/emitter';

import { DebugFlags } from './debug-flags';
import { WorkspaceInfo } from './workspace';

export type EternalVarsEvent =
  | {
      event: 'database-workspace-create';
      payload: WorkspaceInfo;
    }
  | {
      event: 'database-workspace-update';
      payload: { name: string };
    }
  | {
      event: 'database-workspace-delete';
      payload: {
        name: string;
      };
    };

export interface EternalVarsBase {
  debugFlags: DebugFlags;
  appDatabase: AppDatabase;
  emitter: Emitter<DiscriminatedUnionToObject<EternalVarsEvent>>;
}
