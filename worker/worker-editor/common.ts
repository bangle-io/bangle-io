import type { CollabManager } from '@bangle.dev/collab-manager';

import { SliceKey } from '@bangle.io/create-store';
import type { NaukarStateConfig } from '@bangle.io/shared-types';

export const workerEditorSliceKey = new SliceKey<
  {
    collabManager: CollabManager | undefined;
  },
  {
    name: 'action::@bangle.io/worker-naukar:set-editor-manager';
    value: {
      editorManager: CollabManager;
    };
  },
  any,
  NaukarStateConfig
>('workerEditorSlice');
