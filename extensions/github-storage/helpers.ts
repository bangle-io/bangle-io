import { AppState } from '@bangle.io/create-store';
import {
  getStorageProviderName,
  getWorkspaceMetadata,
  getWsName,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';

export function isGithubStorageProvider() {
  return (state: AppState) => {
    const wsName = getWsName()(state);

    if (!wsName) {
      return false;
    }

    return (
      getStorageProviderName(wsName)(state) === GITHUB_STORAGE_PROVIDER_NAME
    );
  };
}

export const readGithubTokenFromStore = () => {
  return workspaceSliceKey.queryOp((state) => {
    const wsName = getWsName()(state);

    if (wsName && isGithubStorageProvider()(state)) {
      const metadata = getWorkspaceMetadata(wsName)(state);

      return metadata?.githubToken as string | undefined;
    }

    return undefined;
  });
};

export async function getVanilaFileSha(file: File) {
  const buffer = await crypto.subtle.digest('SHA-1', await file.arrayBuffer());
  const sha = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return sha;
}
export interface GithubWsMetadata {
  githubToken: string;
  owner: string;
  branch: string;
}
