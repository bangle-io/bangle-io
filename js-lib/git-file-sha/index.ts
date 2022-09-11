import base64 from 'base64-js';

import { weakCache } from '@bangle.io/weak-cache';

export const fileToBase64 = async <T extends Blob>(file: T) => {
  const buffer = await file.arrayBuffer();

  return base64.fromByteArray(new Uint8Array(buffer));
};

export async function calculateGitFileSha<T extends Blob>(file: T) {
  const str = await fileToBase64(file);

  const len = base64.byteLength(str);

  const uint8array = base64.toByteArray(btoa(`blob ${len}\0${atob(str)}`));

  const buffer = await crypto.subtle.digest('SHA-1', uint8array.buffer);

  const sha = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Uncomment to debug what file content corresponds to what sha
  // console.log(sha, JSON.stringify(atob(str)));

  return sha;
}

export const cachedCalculateGitFileSha = weakCache(calculateGitFileSha);
