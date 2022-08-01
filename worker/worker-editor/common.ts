import type {
  CollabManager,
  CollabServerState,
} from '@bangle.dev/collab-manager';

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

export type CollabStateInfo = {
  wsPath: string;
  collabState: CollabServerState;
};

export type WriteNoteToDiskActions = {
  name: 'action::@bangle.io/worker-naukar:write-note-to-disk-update';
  value: CollabStateInfo;
};

export const DISK_SHA_CHECK_INTERVAL = 2000;

export const writeNoteToDiskSliceKey = new SliceKey<
  {
    writeQueue: CollabStateInfo[];
  },
  WriteNoteToDiskActions
>('write-note-to-disk-key');
