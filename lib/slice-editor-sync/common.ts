import type { CollabMessageBus } from '@bangle.dev/collab-comms';

import { SliceKey } from '@bangle.io/create-store';

export type EditorSyncActions = {
  name: 'action::@bangle.io/slice-editor-sync:transfer-port';
  value: {
    port: MessagePort;
    // message channel will be defined in window context
    // and undefined in worker context. This is so that
    // we can properly transfer the port to the other side
    // during action serialization.
    messageChannel?: MessageChannel;
  };
};

export const editorSyncKey = new SliceKey<
  {
    collabMessageBus: CollabMessageBus;
    port: MessagePort | undefined;
    unregister: () => void;
  },
  EditorSyncActions
>('worker-slice-from-naukar');
