import { isWorkerGlobalScope } from '@bangle.io/utils';

import { editorSyncKey } from './common';

export const transferPortEffect = editorSyncKey.effect(() => {
  return {
    deferredOnce(store) {
      // do not run it in worker context, to avoid duplicate firing in worker
      // TODO we should remove this, since slice should not be aware of worker thread
      if (isWorkerGlobalScope()) {
        console.warn('transferPortEffect should not be run in worker context');

        return;
      }

      const messageChannel = new MessageChannel();

      const port = messageChannel.port1;
      store.dispatch({
        name: 'action::@bangle.io/slice-editor-collab-comms:transfer-port',
        value: {
          port,
          messageChannel,
        },
      });
    },
  };
});
