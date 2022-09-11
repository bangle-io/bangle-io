import { Slice } from '@bangle.io/create-store';

import { writeNoteToDiskSliceKey } from './common';
import {
  blockOnPendingWriteEffect,
  calculateCurrentDiskShaEffect,
  calculateLastKnownDiskShaEffect,
  staleDocEffect,
} from './write-note-to-disk-slice-effects';

export function writeNoteToDiskSlice() {
  return new Slice({
    key: writeNoteToDiskSliceKey,
    state: {
      init() {
        return {};
      },
      apply(action, state) {
        return state;
      },
    },

    sideEffect: [
      blockOnPendingWriteEffect,
      calculateCurrentDiskShaEffect,
      calculateLastKnownDiskShaEffect,
      staleDocEffect,
    ],
  });
}
