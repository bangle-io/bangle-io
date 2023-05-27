import { Slice, SliceKey } from '@bangle.io/create-store';

const sliceKey = new SliceKey('slice::@bangle.io/browser-storage:slice-key');

export function browserStorageSlice() {
  return new Slice({
    key: sliceKey,

    sideEffect() {
      return {
        update() {},
      };
    },
  });
}
