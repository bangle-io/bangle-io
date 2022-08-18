import type { BangleApplicationStore } from '@bangle.io/api';
import { database } from '@bangle.io/api';

import type { GithubDBSchema } from './common';
import { EXTENSION_NAME } from './common';

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

export const getDatabase = (state: BangleApplicationStore['state']) => {
  return database.getExtensionDb<GithubDBSchema>(EXTENSION_NAME)(state);
};
