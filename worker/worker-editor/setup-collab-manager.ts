import type { CollabMessageBus } from '@bangle.dev/collab-comms';
import { CollabManager, CollabServerState } from '@bangle.dev/collab-manager';
import type { Schema } from '@bangle.dev/pm';

import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { fs } from '@bangle.io/workspace-info';
import { createWsPath } from '@bangle.io/ws-path';

import type { CollabStateInfo } from './common';
import { WriteQueue } from './write-queue';

export function setupCollabManager(
  schema: Schema,
  collabMessageBus: CollabMessageBus,
  write: (collabStateInfo: CollabStateInfo) => Promise<void>,
  onPendingChange: (
    type: 'ADD' | 'REMOVE',
    wsPath: string,
    pendingWrites: string[],
  ) => void,
  abortSignal: AbortSignal,
  extensionRegistry: ExtensionRegistry,
  onError: (error: Error) => void,
): CollabManager {
  const writeQueue = new WriteQueue(abortSignal, write, onPendingChange);

  return new CollabManager({
    schema: schema,
    collabMessageBus,
    instanceDeleteGuardOpts: {
      deleteWaitTime: 1000,
      maxDurationToKeepRecord: 1000 * 60 * 5,
    },
    getInitialState: async (docName) => {
      try {
        const doc = await fs.getNote(createWsPath(docName), extensionRegistry);
        // TODO should we check if the doc is opened?
        // // We need to make sure the wsPath currently requested is registered
        // // with openedWsPaths.
        // if (!getOpenedWsPaths()(store.state).has(docName)) {
        //   console.warn('setupCollabManager: doc not opened', docName);

        //   return undefined;
        // }

        if (abortSignal.aborted) {
          console.warn('setupCollabManager: abortSignal aborted');

          return undefined;
        }
        if (!doc) {
          console.warn('setupCollabManager: doc not found', docName);

          return undefined;
        }

        return new CollabServerState(doc);
      } catch (error) {
        if (error instanceof Error) {
          onError(error);
        }

        return undefined;
      }
    },
    applyState: (docName, newCollabState, oldCollabState) => {
      // so that we are not blocking collab manager from applying the state
      queueMicrotask(() => {
        writeQueue.add({ wsPath: docName, collabState: newCollabState });
      });

      return true;
    },
  });
}
