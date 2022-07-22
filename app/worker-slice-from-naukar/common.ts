import type { CollabMessageBus } from '@bangle.dev/collab-comms';

import { SliceKey } from '@bangle.io/create-store';

export const workerSliceFromNaukarKey = new SliceKey<
  {
    wsPathsToReset: string[];
    collabMessageBus: CollabMessageBus;
    port: MessagePort | undefined;
  },
  | {
      name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor';
      value: {
        wsPaths: string[];
      };
    }
  | {
      name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor-done';
      value: {
        wsPaths: string[];
      };
    }
>('@bangle.io/worker-slice-from-naukar-key');
