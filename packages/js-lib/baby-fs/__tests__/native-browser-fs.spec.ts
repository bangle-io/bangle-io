/**
 * @vitest-environment happy-dom
 */

import { expect, test } from 'vitest';
import { NativeBrowserFileSystem } from '../native-browser-fs';

class FakeFileHandle {
  readonly kind = 'file';
  private file: File;

  constructor(readonly name: string) {
    this.file = new File([''], name);
  }

  async getFile(): Promise<File> {
    return this.file;
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    return {
      write: async (content: FileSystemWriteChunkType) => {
        this.file =
          content instanceof File
            ? content
            : new File([content as BlobPart], this.name);
      },
      close: async () => {},
    } as FileSystemWritableFileStream;
  }
}

class FakeDirectoryHandle {
  readonly kind = 'directory';
  private entries = new Map<string, FakeDirectoryHandle | FakeFileHandle>();

  constructor(readonly name: string) {}

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    for (const entry of this.entries.values()) {
      yield entry as unknown as FileSystemHandle;
    }
  }

  async getFileHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FakeFileHandle> {
    const existing = this.entries.get(name);
    if (existing instanceof FakeFileHandle) {
      return existing;
    }
    if (existing) {
      throw new DOMException('Entry is not a file', 'TypeMismatchError');
    }
    if (!options.create) {
      throw new DOMException('File not found', 'NotFoundError');
    }

    const fileHandle = new FakeFileHandle(name);
    this.entries.set(name, fileHandle);
    return fileHandle;
  }

  async getDirectoryHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FakeDirectoryHandle> {
    const existing = this.entries.get(name);
    if (existing instanceof FakeDirectoryHandle) {
      return existing;
    }
    if (existing) {
      throw new DOMException('Entry is not a directory', 'TypeMismatchError');
    }
    if (!options.create) {
      throw new DOMException('Directory not found', 'NotFoundError');
    }

    const directoryHandle = new FakeDirectoryHandle(name);
    this.entries.set(name, directoryHandle);
    return directoryHandle;
  }

  async removeEntry(name: string): Promise<void> {
    this.entries.delete(name);
  }
}

const toFile = (text: string) =>
  new File([text], 'note.md', { type: 'text/plain' });

test('createFile rejects existing files without overwriting', async () => {
  const rootDirHandle = new FakeDirectoryHandle(
    'workspace',
  ) as unknown as FileSystemDirectoryHandle;
  const fs = new NativeBrowserFileSystem({ rootDirHandle });

  await fs.createFile('workspace/note.md', toFile('original'));
  await expect(
    fs.createFile('workspace/note.md', toFile('replacement')),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[NativeBrowserFileSystemError: File "workspace/note.md" already exists]`,
  );

  await expect(fs.readFileAsText('workspace/note.md')).resolves.toBe(
    'original',
  );
});
