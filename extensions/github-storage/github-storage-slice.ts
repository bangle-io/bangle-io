import { Slice, SliceKey } from '@bangle.io/create-store';

const sliceKey = new SliceKey('slice::@bangle.io/github-storage:slice-key');

export function githubStorageSlice() {
  return new Slice({
    key: sliceKey,
  });
}
