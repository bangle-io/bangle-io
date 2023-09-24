import { weakCache } from '@bangle.io/weak-cache';

export async function calculateGitFileSha(file: Blob) {
  // Read the file content as ArrayBuffer.
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const encoder = new TextEncoder();

  // Prepend the Git header.
  const header = encoder.encode(`blob ${uint8Array.length}\0`);
  const data = new Uint8Array(header.length + uint8Array.length);
  data.set(header);
  data.set(uint8Array, header.length);

  // Check the environment.
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Running in browser environment
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);

    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else if (typeof require !== 'undefined') {
    // Running in Node.js environment
    const crypto = require('crypto');
    const hash = crypto.createHash('sha1');
    hash.update(data);

    return hash.digest('hex');
  } else {
    throw new Error('Unsupported environment');
  }
}

// export async function calculateGitFileSha2<T extends Blob>(file: T) {
//   const str = await fileToBase64(file);

//   const len = base64.byteLength(str);

//   const uint8array = base64ToUint8Array(btoa(`blob ${len}\0${atob(str)}`));
//   let _crypto = crypto;

//   const buffer = await _crypto.subtle.digest('SHA-1', uint8array.buffer);

//   const sha = Array.from(new Uint8Array(buffer))
//     .map((b) => b.toString(16).padStart(2, '0'))
//     .join('');

//   // Uncomment to debug what file content corresponds to what sha
//   // console.log(sha, JSON.stringify(atob(str)));

//   return sha;
// }

export const cachedCalculateGitFileSha = weakCache(calculateGitFileSha);

// function base64ToUint8Array(base64: string) {
//   const binary_string = atob(base64);
//   const len = binary_string.length;
//   const bytes = new Uint8Array(len);
//   for (let i = 0; i < len; i++) {
//     bytes[i] = binary_string.charCodeAt(i);
//   }

//   return bytes;
// }

export async function fileToBase64(blob: Blob) {
  // Check if running in browser environment
  if (
    typeof window !== 'undefined' &&
    'Blob' in window &&
    blob instanceof Blob
  ) {
    // Read the Blob as ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]!);
    }

    return btoa(binary);
  }
  // Check if running in Node.js environment
  else if (typeof Buffer !== 'undefined') {
    // Read the Blob as Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to Base64
    return buffer.toString('base64');
  }
  // If none of the above, throw an error
  else {
    throw new Error(
      'Unsupported environment: Unable to convert blob to base64 string',
    );
  }
}
