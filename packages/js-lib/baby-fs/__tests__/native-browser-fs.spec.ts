/**
 * @vitest-environment happy-dom
 */

import { expect, test, vi } from 'vitest';
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

  constructor(
    readonly name: string,
    // Called every time an entry is yielded from `values()`, at any depth.
    // Test-only hook used to observe (and interrupt, via an AbortController)
    // a recursive traversal while it's in progress, rather than only after
    // it has fully completed.
    private onVisit?: () => void,
  ) {}

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    for (const entry of this.entries.values()) {
      this.onVisit?.();
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

    const directoryHandle = new FakeDirectoryHandle(name, this.onVisit);
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

test('rename moves content and removes the source', async () => {
  const rootDirHandle = new FakeDirectoryHandle(
    'workspace',
  ) as unknown as FileSystemDirectoryHandle;
  const fs = new NativeBrowserFileSystem({ rootDirHandle });

  await fs.createFile('workspace/note.md', toFile('mydata'));
  await fs.rename('workspace/note.md', 'workspace/renamed.md');

  await expect(fs.readFileAsText('workspace/renamed.md')).resolves.toBe(
    'mydata',
  );
  await expect(fs.readFile('workspace/note.md')).rejects.toThrow('not found');
});

test('rename keeps the source when the destination write fails', async () => {
  const rootDirHandle = new FakeDirectoryHandle(
    'workspace',
  ) as unknown as FileSystemDirectoryHandle;
  const fs = new NativeBrowserFileSystem({ rootDirHandle });
  await fs.createFile('workspace/note.md', toFile('mydata'));

  const writeSpy = vi
    .spyOn(fs, 'writeFile')
    .mockRejectedValueOnce(new Error('forced write failure'));

  // The constructor wraps rename with catchUpstreamError, so the forced
  // failure surfaces as the generic upstream rename error.
  await expect(
    fs.rename('workspace/note.md', 'workspace/renamed.md'),
  ).rejects.toThrow('Unable to rename file');
  writeSpy.mockRestore();

  await expect(fs.readFileAsText('workspace/note.md')).resolves.toBe('mydata');
});

test('rename keeps the source when the destination copy is incomplete', async () => {
  const rootDirHandle = new FakeDirectoryHandle(
    'workspace',
  ) as unknown as FileSystemDirectoryHandle;
  const fs = new NativeBrowserFileSystem({ rootDirHandle });
  await fs.createFile('workspace/note.md', toFile('mydata'));

  const originalWriteFile = fs.writeFile.bind(fs);
  const writeSpy = vi
    .spyOn(fs, 'writeFile')
    .mockImplementation(async (filePath) => {
      // Simulate a partial write: the destination lands truncated.
      await originalWriteFile(filePath, toFile('my'));
    });

  await expect(
    fs.rename('workspace/note.md', 'workspace/renamed.md'),
  ).rejects.toThrow('written incompletely');
  writeSpy.mockRestore();

  await expect(fs.readFileAsText('workspace/note.md')).resolves.toBe('mydata');
});

test('rename surfaces unlink failures while both copies exist', async () => {
  const rootDirHandle = new FakeDirectoryHandle(
    'workspace',
  ) as unknown as FileSystemDirectoryHandle;
  const fs = new NativeBrowserFileSystem({ rootDirHandle });
  await fs.createFile('workspace/note.md', toFile('mydata'));

  const unlinkSpy = vi
    .spyOn(fs, 'unlink')
    .mockRejectedValueOnce(new Error('forced unlink failure'));

  // The constructor wraps rename with catchUpstreamError, so the forced
  // failure surfaces as the generic upstream rename error.
  await expect(
    fs.rename('workspace/note.md', 'workspace/renamed.md'),
  ).rejects.toThrow('Unable to rename file');
  unlinkSpy.mockRestore();

  // Duplicate copies are the recoverable outcome; no content may be lost.
  await expect(fs.readFileAsText('workspace/note.md')).resolves.toBe('mydata');
  await expect(fs.readFileAsText('workspace/renamed.md')).resolves.toBe(
    'mydata',
  );
});
