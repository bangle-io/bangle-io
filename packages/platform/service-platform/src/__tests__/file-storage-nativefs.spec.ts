/**
 * @vitest-environment happy-dom
 */

import { FILE_STORAGE_MAX_FILE_SIZE_BYTES } from '@bangle.io/constants';
import { isAbortError } from '@bangle.io/mini-js-utils';
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
  shouldThrowNotFoundOnRead = false;
  valuesCalls = 0;

  constructor(
    readonly name: string,
    // Called every time an entry is yielded from `values()`, at any depth.
    // Test-only hook used to observe (and interrupt, via an
    // AbortController) a recursive traversal while it's in progress.
    private onEntryVisited?: () => void,
  ) {}

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    this.valuesCalls += 1;
    if (this.shouldThrowNotFoundOnRead) {
      throw new DOMException('Directory not found', 'NotFoundError');
    }

    for (const entry of this.entries.values()) {
      this.onEntryVisited?.();
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

    const directoryHandle = new FakeDirectoryHandle(name, this.onEntryVisited);
    this.entries.set(name, directoryHandle);
    return directoryHandle;
  }

  async removeEntry(name: string): Promise<void> {
    this.entries.delete(name);
  }
}

async function setup(onEntryVisited?: () => void) {
  const { commonOpts } = createTestEnvironment();
  const onChange = vi.fn();
  const rootDirHandle = new FakeDirectoryHandle(
    'myWorkspace',
    onEntryVisited,
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
  return { service, onChange, rootDirHandle };
}

describe('FileStorageNativeFs', () => {
  it('declares a larger native storage file-size limit', async () => {
    const { service } = await setup();

    expect(service.maxFileSizeBytes).toBe(
      FILE_STORAGE_MAX_FILE_SIZE_BYTES.nativeFs,
    );
  });

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

  it('maps missing native workspace roots during listing to a typed app error', async () => {
    const { service, rootDirHandle } = await setup();
    (
      rootDirHandle as unknown as FakeDirectoryHandle
    ).shouldThrowNotFoundOnRead = true;

    await expect(
      service.listAllFiles('myWorkspace', new AbortController().signal),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file-storage:file-does-not-exist',
        payload: {
          storage: 'file-storage-nativefs',
          wsPath: 'myWorkspace:',
        },
      }),
    });
  });

  it('prunes ignored dirs during native storage listing without blocking explicit reads', async () => {
    const { service, rootDirHandle } = await setup();
    const root = rootDirHandle as unknown as FakeDirectoryHandle;
    const docs = await root.getDirectoryHandle('docs', { create: true });
    await docs.getFileHandle('keep.md', { create: true });
    const nodeModules = await root.getDirectoryHandle('node_modules', {
      create: true,
    });
    await nodeModules.getFileHandle('ignored.ts', { create: true });
    const git = await root.getDirectoryHandle('.git', { create: true });
    await git.getFileHandle('config', { create: true });

    await expect(
      service.listAllFiles('myWorkspace', new AbortController().signal),
    ).resolves.toEqual(['myWorkspace:docs/keep.md']);

    await expect(
      service.readFile('myWorkspace:node_modules/ignored.ts'),
    ).resolves.toBeDefined();

    expect(docs.valuesCalls).toBe(1);
    expect(nodeModules.valuesCalls).toBe(0);
    expect(git.valuesCalls).toBe(0);
  });

  it('rejects immediately with an abort error when the signal is already aborted, without reading any directory', async () => {
    const { service, rootDirHandle } = await setup();
    const abortController = new AbortController();
    abortController.abort();

    const error = await service
      .listAllFiles('myWorkspace', abortController.signal)
      .catch((e: unknown) => e);

    expect(isAbortError(error)).toBe(true);
    expect((rootDirHandle as unknown as FakeDirectoryHandle).valuesCalls).toBe(
      0,
    );
  });

  it('interrupts an in-progress recursive listing instead of walking the whole tree', async () => {
    const abortController = new AbortController();
    let entriesVisited = 0;
    const { service, rootDirHandle } = await setup(() => {
      entriesVisited += 1;
      // Abort partway through the walk, well before every directory in
      // the tree would have been visited.
      if (entriesVisited === 2) {
        abortController.abort();
      }
    });
    const root = rootDirHandle as unknown as FakeDirectoryHandle;
    const dirA = await root.getDirectoryHandle('dirA', { create: true });
    await dirA.getFileHandle('a1.md', { create: true });
    await dirA.getFileHandle('a2.md', { create: true });
    const dirB = await root.getDirectoryHandle('dirB', { create: true });
    await dirB.getFileHandle('b1.md', { create: true });
    await dirB.getFileHandle('b2.md', { create: true });

    const error = await service
      .listAllFiles('myWorkspace', abortController.signal)
      .catch((e: unknown) => e);

    expect(isAbortError(error)).toBe(true);
    // The walk was interrupted while still inside dirA — dirB must never
    // have been reached at all. This proves the traversal actually halted
    // early instead of completing and only discarding the result afterward.
    expect(dirB.valuesCalls).toBe(0);
    expect(dirA.valuesCalls).toBe(1);
  });
});
