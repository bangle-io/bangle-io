import { workspace } from '@bangle.io/api';

import type { GithubWsMetadata } from './common';
import { GITHUB_STORAGE_PROVIDER_NAME } from './common';

export async function getVanilaFileSha(file: File) {
  const buffer = await crypto.subtle.digest('SHA-1', await file.arrayBuffer());
  const sha = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return sha;
}

export async function readGhWorkspaceMetadata(
  wsName: string,
): Promise<GithubWsMetadata | undefined> {
  return workspace.readWorkspaceMetadata(wsName, {
    type: GITHUB_STORAGE_PROVIDER_NAME,
  }) as Promise<GithubWsMetadata | undefined>;
}
