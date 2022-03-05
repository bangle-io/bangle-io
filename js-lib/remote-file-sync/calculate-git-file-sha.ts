import base64 from 'base64-js';

import { fileToBase64 } from './read-file-as-text';

export async function calculateGitFileSha<T extends Blob>(file: T) {
  const str = await fileToBase64(file);

  const len = base64.byteLength(str);

  const uint8array = base64.toByteArray(btoa(`blob ${len}\0${atob(str)}`));

  const buffer = await crypto.subtle.digest('SHA-1', uint8array.buffer);

  const sha = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return sha;
}
