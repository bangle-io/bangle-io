import { Slice, SliceKey } from '@bangle.io/create-store';

import { GithubStorageProvider } from './github-storage-provider';

const sliceKey = new SliceKey('slice::@bangle.io/github-storage:slice-key');

export function githubStorageSlice(
  githubStorageProvider: GithubStorageProvider,
) {
  return new Slice({
    key: sliceKey,
  });
}
