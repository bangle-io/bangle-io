import { AppDatabase } from '@bangle.io/app-database';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { Emitter } from '@bangle.io/emitter';
import type {
  EternalVarsBase,
  EternalVarsEvent,
  EternalVarsEventSourceInfo,
} from '@bangle.io/shared-types';
import { UserPreferenceManager } from '@bangle.io/user-preference';

import { logger } from './logger';
import type { EternalVarsSetupBase } from './types';

export function setupCommon(config: EternalVarsSetupBase): EternalVarsBase {
  logger.debug('debugFlags', config.debugFlags);

  const emitter = Emitter.create<EternalVarsEvent>();

  const getSourceInfo = (): EternalVarsEventSourceInfo => ({
    browsingContextId: BROWSING_CONTEXT_ID,
    timestamp: Date.now(),
  });

  const appDatabase = new AppDatabase({
    database: config.baseDatabase,
    onChange: (change) => {
      switch (change.type) {
        case 'workspace-create': {
          emitter.emit('@event::database:workspace-create', {
            wsInfo: change.payload,
            source: getSourceInfo(),
          });
          break;
        }
        case 'workspace-update': {
          emitter.emit('@event::database:workspace-update', {
            wsName: change.payload.name,
            source: getSourceInfo(),
          });
          break;
        }
        case 'workspace-delete': {
          emitter.emit('@event::database:workspace-delete', {
            wsName: change.payload.name,
            source: getSourceInfo(),
          });
          break;
        }
        default: {
          let x: never = change;
          throw new Error(`Unhandled workspace event`);
        }
      }
    },
  });

  const userPreferenceManager = new UserPreferenceManager({
    database: appDatabase,
    onChange: () => {
      emitter.emit('@event::user-preference:change', {
        source: getSourceInfo(),
      });
    },
  });

  return {
    debugFlags: config.debugFlags,
    appDatabase,
    emitter,
    userPreferenceManager,
  };
}
