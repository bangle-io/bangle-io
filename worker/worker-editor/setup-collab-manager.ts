import type { CollabMessageBus } from '@bangle.dev/collab-comms';
import { CollabManager, CollabServerState } from '@bangle.dev/collab-manager';
import type { Schema } from '@bangle.dev/pm';

import type { ApplicationStore } from '@bangle.io/create-store';
import { getNote, getOpenedWsPaths } from '@bangle.io/slice-workspace';

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

        // We need to make sure the wsPath currently requested is registered
        // with openedWsPaths.
        if (!getOpenedWsPaths()(store.state).has(docName)) {
          console.warn('doc not opened');

          return undefined;
        }

        if (!doc) {
          console.warn('doc not found', docName);

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
