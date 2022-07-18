import { CollabManager, CollabServerState } from '@bangle.dev/collab-server';
import type { Schema } from '@bangle.dev/pm';

import type { ApplicationStore } from '@bangle.io/create-store';
import type { ExtensionRegistry } from '@bangle.io/shared-types';
import { getNote } from '@bangle.io/slice-workspace';

import type { DocChangeEmitter } from './doc-change-emitter';

export const DOC_WRITE_DEBOUNCE_WAIT = 250;
export const DOC_WRITE_DEBOUNCE_MAX_WAIT = 1000;

export interface NaukarStateConfig {
  readonly extensionRegistry: ExtensionRegistry;
  readonly docChangeEmitter: DocChangeEmitter;
  readonly port: MessagePort;
}

export function setupCollabManager(
  schema: Schema,
  store: ApplicationStore,
  docChangeEmitter: DocChangeEmitter,
) {
  return new CollabManager({
    schema: schema,
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
      docChangeEmitter.emit({
        wsPath: docName,
        newCollabState,
        oldCollabState,
      });

      return true;
    },
  });
}
