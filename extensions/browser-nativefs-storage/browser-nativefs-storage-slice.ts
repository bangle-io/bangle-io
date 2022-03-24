import { Slice, SliceKey } from '@bangle.io/api';

const sliceKey = new SliceKey(
  'slice::@bangle.io/browser-nativefs-storage:slice-key',
);

export function nativeFsStorageSlice() {
  return new Slice({
    key: sliceKey,

    sideEffect() {
      return {
        update() {},
      };
    },
  });
}
