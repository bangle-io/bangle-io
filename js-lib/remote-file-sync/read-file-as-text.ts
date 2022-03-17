import base64 from 'base64-js';

export const fileToBase64 = async <T extends Blob>(file: T) => {
  const buffer = await file.arrayBuffer();

  return base64.fromByteArray(new Uint8Array(buffer));
};
