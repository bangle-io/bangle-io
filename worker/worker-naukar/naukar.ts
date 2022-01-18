import type { Manager } from '@bangle.dev/collab-server';

import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { asssertNotUndefined, getSelfType } from '@bangle.io/utils';

import { abortableServices } from './abortable-services';
import { getEditorManager } from './slices/editor-manager-slice';
import { initializeNaukarStore } from './store/initialize-naukar-store';

const LOG = false;

const log = LOG ? console.log.bind(console, 'naukar') : () => {};

// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar(extensionRegistry: ExtensionRegistry) {
  const envType = getSelfType();

  console.debug('Naukar running in ', envType);

  let store: ReturnType<typeof initializeNaukarStore> | undefined;

  // main-dispatch-end

  const handleCollabRequest: Manager['handleRequest'] = async (...args) => {
    asssertNotUndefined(
      store,
      'handleCollabRequest called but store is not yet defined',
    );

    let editorManager = getEditorManager()(store.state, store.dispatch);

    asssertNotUndefined(
      editorManager,
      'handleCollabRequest called but editorManager is not yet defined',
    );

    return editorManager.handleRequest(...args);
  };

  // eslint-disable-next-line no-restricted-globals, no-undef
  (self as any).store = store;
  return {
    // app state
    async sendMessagePort(port: MessageChannel['port2']) {
      store = initializeNaukarStore({ port, extensionRegistry });
    },

    // collab
    handleCollabRequest,

    async status() {
      return true;
    },

    ...abortableServices({ extensionRegistry }),
  };
}

export type WorkerAPI = ReturnType<typeof createNaukar>;
