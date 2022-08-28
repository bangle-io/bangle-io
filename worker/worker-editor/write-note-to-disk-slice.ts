import { Slice } from '@bangle.io/create-store';
import { assertActionName } from '@bangle.io/utils';

import type { CollabStateInfo, WriteNoteToDiskActions } from './common';
import { writeNoteToDiskSliceKey } from './common';
import {
  blockOnPendingWriteEffect,
  calculateCurrentDiskShaEffect,
  calculateLastKnownDiskShaEffect,
  staleDocEffect,
  writeToDiskEffect,
} from './write-note-to-disk-slice-effects';

export function queueWrite(value: CollabStateInfo) {
  return writeNoteToDiskSliceKey.op((state, dispatch) => {
    return dispatch({
      name: 'action::@bangle.io/worker-naukar:write-note-to-disk-update',
      value,
    });
  });
}

export function writeNoteToDiskSlice() {
  assertActionName('@bangle.io/worker-naukar', {} as WriteNoteToDiskActions);

  return new Slice({
    key: writeNoteToDiskSliceKey,
    state: {
      init() {
        return { writeQueue: [] };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/worker-naukar:write-note-to-disk-update': {
            const { writeQueue } = state;
            const { wsPath, collabState } = action.value;
            const existing = writeQueue.find((item) => item.wsPath === wsPath);

            // Modifying in place to be efficient
            if (existing) {
              existing.collabState = collabState;
            } else {
              writeQueue.push({ wsPath, collabState });
            }

            return state;
          }
          default: {
            return state;
          }
        }
      },
    },

    sideEffect: [
      blockOnPendingWriteEffect,
      calculateCurrentDiskShaEffect,
      calculateLastKnownDiskShaEffect,
      staleDocEffect,
      writeToDiskEffect,
    ],
  });
}
