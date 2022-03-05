import { readFile } from 'fs/promises';

export const readFileBlob = async (filename: string): Promise<File> =>
  new Blob(
    [await readFile(require('path').join(__dirname, `fixtures/${filename}`))],
    { type: 'text/plain' },
  ) as any;
