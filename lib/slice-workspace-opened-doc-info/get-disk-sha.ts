import type { ApplicationStore } from '@bangle.io/create-store';
import { cachedCalculateGitFileSha } from '@bangle.io/git-file-sha';
import { getFile } from '@bangle.io/slice-workspace';

// reads the file from the disk and returns its sha
export const getDiskSha = async (
  wsPath: string,
  store: ApplicationStore,
): Promise<string | null> => {
  try {
    const file = await getFile(wsPath)(store.state, store.dispatch, store);

    if (file) {
      return cachedCalculateGitFileSha(file);
    }

    return null;
  } catch {
    // ignore errors as we donot want to handle them here
    return null;
  }
};
