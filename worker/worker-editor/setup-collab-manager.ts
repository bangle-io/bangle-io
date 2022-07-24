import type { CollabMessageBus } from '@bangle.dev/collab-comms';
import { CollabManager, CollabServerState } from '@bangle.dev/collab-manager';
import type { Schema } from '@bangle.dev/pm';

import type { ApplicationStore } from '@bangle.io/create-store';
import { getNote } from '@bangle.io/slice-workspace';

import { queueWrite } from './write-note-to-disk-slice';

export function setupCollabManager(
  schema: Schema,
  store: ApplicationStore,
  collabMessageBus: CollabMessageBus,
) {
  return new CollabManager({
    schema: schema,
    collabMessageBus,
    getInitialState: async (docName) => {
      try {
        const doc = await getNote(docName)(store.state, store.dispatch, store);

        if (!doc) {
          console.warn('doc not found', docName);

          return undefined;
        }

        return new CollabServerState(doc);
      } catch (error) {
        queueMicrotask(() => {
          if (error instanceof Error) {
            store.errorHandler(error);
          }
        });

        return undefined;
      }
    },
    applyState: (docName, newCollabState, oldCollabState) => {
      queueMicrotask(() => {
        queueWrite({
          wsPath: docName,
          collabState: newCollabState,
        })(store.state, store.dispatch);
      });

      return true;
    },
  });
}
