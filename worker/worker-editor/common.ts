import type {
  CollabManager,
  CollabServerState,
} from '@bangle.dev/collab-manager';

import { SliceKey } from '@bangle.io/create-store';
import type { NaukarStateConfig } from '@bangle.io/shared-types';

export const workerEditorSliceKey = new SliceKey<
  {
    collab:
      | undefined
      | {
          manager: CollabManager;
          // Controller exists so that we can run additional cleanup code
          // whenever we want to terminate the collab manager.
          controller: AbortController;
        };
  },
  {
    name: 'action::@bangle.io/worker-editor:set-editor-manager';
    value: {
      manager: CollabManager;
      controller: AbortController;
    };
  },
  any,
  NaukarStateConfig
>('workerEditorSlice');

export type CollabStateInfo = {
  wsPath: string;
  collabState: CollabServerState;
};

export const DISK_SHA_CHECK_INTERVAL = 2000;

export const writeNoteToDiskSliceKey = new SliceKey<{}>(
  'write-note-to-disk-key',
);
