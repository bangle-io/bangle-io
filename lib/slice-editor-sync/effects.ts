import { isWorkerGlobalScope } from '@bangle.io/utils';

import { editorSyncKey } from './common';

export const transferPortEffect = editorSyncKey.effect(() => {
  return {
    deferredOnce(store) {
      // donot run it in worker context, to avoid duplicate firing in worker
      if (isWorkerGlobalScope()) {
        return;
      }

      const messageChannel = new MessageChannel();

      const port = messageChannel.port1;
      store.dispatch({
        name: 'action::@bangle.io/slice-editor-sync:transfer-port',
        value: {
          port,
          messageChannel,
        },
      });
    },
  };
});
