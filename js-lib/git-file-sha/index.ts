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
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    globalThis.crypto.subtle
  ) {
    // Running in browser environment
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-1', data);

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

export const cachedCalculateGitFileSha = weakCache(calculateGitFileSha);

export async function fileToBase64(blob: Blob): Promise<string> {
  // Check if running in browser environment
  if (
    typeof globalThis !== 'undefined' &&
    'Blob' in globalThis &&
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
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to Base64
    return buffer.toString('base64');
  } else {
    throw new Error(
      'Unsupported environment: Unable to convert blob to base64 string',
    );
  }
}
