import { AppDatabase } from '@bangle.io/app-database';
import { Emitter } from '@bangle.io/emitter';
import type { EternalVarsBase } from '@bangle.io/shared-types';
import { EternalVarsEvent } from '@bangle.io/shared-types';
import { UserPreferenceManager } from '@bangle.io/user-preference';

import type { EternalVarsSetupBase } from './types';

export function setupCommon(config: EternalVarsSetupBase): EternalVarsBase {
  console.debug('debugFlags', config.debugFlags);

  const emitter = Emitter.create<EternalVarsEvent>();
  const appDatabase = new AppDatabase({
    database: config.baseDatabase,
    onChange: (change) => {
      switch (change.type) {
        case 'workspace-create': {
          emitter.emit('@event::database:workspace-create', change.payload);
          break;
        }
        case 'workspace-update': {
          emitter.emit('@event::database:workspace-update', change.payload);
          break;
        }
        case 'workspace-delete': {
          emitter.emit('@event::database:workspace-delete', change.payload);
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
      emitter.emit('@event::user-preference:change', undefined);
    },
  });

  return {
    debugFlags: config.debugFlags,
    appDatabase,
    emitter,
    userPreferenceManager,
  };
}
