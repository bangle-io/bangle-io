import { readFileAsText } from '@bangle.io/baby-fs';
import {
  getWorkspaceInfo,
  getWorkspaceMetadata,
  getWsName,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';

export const readGithubTokenFromStore = () => {
  return workspaceSliceKey.queryOp((state) => {
    const wsName = getWsName()(state);

    if (wsName) {
      const wsInfo = getWorkspaceInfo(wsName)(state);

      if (wsInfo && wsInfo.type === GITHUB_STORAGE_PROVIDER_NAME) {
        let metadata = getWorkspaceMetadata(wsName)(state);
        return metadata?.githubToken as string | undefined;
      }
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
export interface WsMetadata {
  githubToken: string;
  owner: string;
  branch: string;
}
