/**
 * @vitest-environment happy-dom
 */

import { createTestEnvironment } from '@bangle.io/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { FileStorageNativeFs } from '../file-storage-nativefs';

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

async function setup() {
  const { commonOpts } = createTestEnvironment();
  const onChange = vi.fn();
  const rootDirHandle = new FakeDirectoryHandle(
    'myWorkspace',
  ) as unknown as FileSystemDirectoryHandle;
  const service = new FileStorageNativeFs(
    {
      ctx: commonOpts,
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
    },
    null,
    {
      getRootDirHandle: async () => ({ handle: rootDirHandle }),
      onChange,
    },
  );
  await service.mount();
  return { service, onChange };
}

describe('FileStorageNativeFs', () => {
  it('provider contract: createFile rejects existing files without overwriting', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:myNote.md';

    await service.createFile(wsPath, new File(['Original'], 'myNote.md'));
    await expect(
      service.createFile(wsPath, new File(['Replacement'], 'myNote.md')),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:already-existing',
        payload: { wsPath },
      }),
    });

    const readFile = await service.readFile(wsPath);
    expect(await readFile?.text()).toBe('Original');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
