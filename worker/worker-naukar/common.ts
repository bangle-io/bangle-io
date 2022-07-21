import type { CollabMessageBus } from '@bangle.dev/collab-manager';
import { CollabManager, CollabServerState } from '@bangle.dev/collab-manager';
import type { Schema } from '@bangle.dev/pm';

import type { ApplicationStore } from '@bangle.io/create-store';
import type { ExtensionRegistry } from '@bangle.io/shared-types';
import { getNote } from '@bangle.io/slice-workspace';

import { updateCollabStateInfo } from './slices/write-note-to-disk-slice';

export const DOC_WRITE_DEBOUNCE_WAIT = 250;
export const DOC_WRITE_DEBOUNCE_MAX_WAIT = 1000;

export interface NaukarStateConfig {
  readonly extensionRegistry: ExtensionRegistry;
  readonly port: MessagePort;
  readonly collabMessageBus: CollabMessageBus;
}

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
        if (error instanceof Error) {
          store.errorHandler(error);
        }

        return undefined;
      }
    },
    applyState: (docName, newCollabState, oldCollabState) => {
      queueMicrotask(() => {
        updateCollabStateInfo({
          wsPath: docName,
          collabState: newCollabState,
        })(store.state, store.dispatch);
      });

      return true;
    },
  });
}
