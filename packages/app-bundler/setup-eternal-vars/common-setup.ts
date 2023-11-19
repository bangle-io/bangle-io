import { AppDatabase } from '@bangle.io/app-database';
import { createBroadcaster } from '@bangle.io/broadcaster';
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

const THRESHOLD_MS = 20;
const THRESHOLD_COUNT = 150;

export function setupCommon(config: EternalVarsSetupBase): EternalVarsBase {
  logger.debug('debugFlags', config.debugFlags);

  const emitter = Emitter.create<EternalVarsEvent>();

  const getSourceInfo = (): EternalVarsEventSourceInfo => ({
    browsingContextId: BROWSING_CONTEXT_ID,
    timestamp: Date.now(),
  });

  const broadcast = createBroadcaster<EternalVarsEvent>();

  let messageCount = 0;
  let startTime = Date.now();

  broadcast.onAll((event) => {
    const currentTime = Date.now();

    // Reset the count if the time window has passed
    if (currentTime - startTime > THRESHOLD_MS) {
      messageCount = 0;
      startTime = currentTime;
    }

    // Check if the threshold is exceeded
    if (messageCount++ > THRESHOLD_COUNT) {
      throw new Error('Too many messages received in a short period of time.');
    }

    logger.debug('received broadcast event from', event.event, event.payload);

    // we re-emit any event from broadcast channel to the main emitter
    switch (event.event) {
      case '@event::database:workspace-create': {
        emitter.emit(event.event, event.payload);
        break;
      }

      case '@event::database:workspace-update': {
        emitter.emit(event.event, event.payload);
        break;
      }

      case '@event::database:workspace-delete': {
        emitter.emit(event.event, event.payload);
        break;
      }

      case '@event::user-preference:change': {
        emitter.emit(event.event, event.payload);
        break;
      }

      default: {
        let x: never = event;
        throw new Error(`Unhandled event`);
      }
    }
  });

  const appDatabase = new AppDatabase({
    database: config.baseDatabase,
    onChange: (change) => {
      switch (change.type) {
        case 'workspace-create': {
          [emitter, broadcast].forEach((e) =>
            e.emit('@event::database:workspace-create', {
              wsName: change.payload.name,
              source: getSourceInfo(),
            }),
          );
          break;
        }
        case 'workspace-update': {
          [emitter, broadcast].forEach((e) =>
            e.emit('@event::database:workspace-update', {
              wsName: change.payload.name,
              source: getSourceInfo(),
            }),
          );
          break;
        }
        case 'workspace-delete': {
          [emitter, broadcast].forEach((e) =>
            e.emit('@event::database:workspace-delete', {
              wsName: change.payload.name,
              source: getSourceInfo(),
            }),
          );
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
      [emitter, broadcast].forEach((e) =>
        e.emit('@event::user-preference:change', {
          source: getSourceInfo(),
        }),
      );
    },
  });

  return {
    debugFlags: config.debugFlags,
    appDatabase,
    emitter,
    userPreferenceManager,
  };
}
