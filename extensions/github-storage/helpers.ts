import { BangleAppState, workspace } from '@bangle.io/api';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';

export function isGithubStorageProvider() {
  return (state: BangleAppState) => {
    const wsName = workspace.getWsName()(state);

    if (!wsName) {
      return false;
    }

    return (
      workspace.getStorageProviderName(wsName)(state) ===
      GITHUB_STORAGE_PROVIDER_NAME
    );
  };
}

export const readGithubTokenFromStore = () => {
  return workspace.workspaceSliceKey.queryOp((state) => {
    const wsName = workspace.getWsName()(state);

    if (wsName && isGithubStorageProvider()(state)) {
      const metadata = workspace.getWorkspaceMetadata(wsName)(state);

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
