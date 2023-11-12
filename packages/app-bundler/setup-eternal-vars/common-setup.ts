import { AppDatabase } from '@bangle.io/app-database';
import { Emitter } from '@bangle.io/emitter';
import type { EternalVarsBase } from '@bangle.io/shared-types';
import { EternalVarsEvent } from '@bangle.io/shared-types/eternal-vars-base';

import type { EternalVarsSetupBase } from './types';

export function setupCommon(config: EternalVarsSetupBase): EternalVarsBase {
  console.debug('debugFlags', config.debugFlags);

  const emitter = Emitter.create<EternalVarsEvent>();

  const appDatabase = new AppDatabase({
    database: config.baseDatabase,
    onChange: (change) => {
      switch (change.type) {
        case 'workspace-create': {
          emitter.emit('database-workspace-create', change.payload);
          break;
        }
        case 'workspace-update': {
          emitter.emit('database-workspace-update', change.payload);
          break;
        }
        case 'workspace-delete': {
          emitter.emit('database-workspace-delete', change.payload);
          break;
        }
        default: {
          let x: never = change;

          throw new Error(`Unhandled workspace event`);
        }
      }
    },
  });

  return {
    debugFlags: config.debugFlags,
    appDatabase,
    emitter,
  };
}
