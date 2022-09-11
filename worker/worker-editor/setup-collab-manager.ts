import type { CollabMessageBus } from '@bangle.dev/collab-comms';
import { CollabManager, CollabServerState } from '@bangle.dev/collab-manager';
import type { Schema } from '@bangle.dev/pm';

import type { ApplicationStore } from '@bangle.io/create-store';
import { getNote, getOpenedWsPaths } from '@bangle.io/slice-workspace';

import type { CollabStateInfo } from './common';
import { WriteQueue } from './write-queue';

export function setupCollabManager(
  schema: Schema,
  store: ApplicationStore,
  collabMessageBus: CollabMessageBus,
  write: (collabStateInfo: CollabStateInfo) => Promise<void>,
  onPendingChange: (
    type: 'ADD' | 'REMOVE',
    wsPath: string,
    pendingWrites: string[],
  ) => void,
  abortSignal: AbortSignal,
) {
  const writeQueue = new WriteQueue(abortSignal, write, onPendingChange);

  return new CollabManager({
    schema: schema,
    collabMessageBus,
    getInitialState: async (docName) => {
      try {
        const doc = await getNote(docName)(store.state, store.dispatch, store);

        // We need to make sure the wsPath currently requested is registered
        // with openedWsPaths.
        if (!getOpenedWsPaths()(store.state).has(docName)) {
          console.warn('setupCollabManager: doc not opened', docName);

          return undefined;
        }

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
          store.errorHandler(error);
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
