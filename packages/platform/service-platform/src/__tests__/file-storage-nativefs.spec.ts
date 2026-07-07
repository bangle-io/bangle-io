/**
 * @vitest-environment happy-dom
 */

import { FILE_STORAGE_MAX_FILE_SIZE_BYTES } from '@bangle.io/constants';
import { isAbortError } from '@bangle.io/mini-js-utils';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileStorageNativeFs } from '../file-storage-nativefs';
import { testCrossWorkspaceRenameContract } from './file-storage-rename-contract';

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

afterEach(() => {
  vi.unstubAllGlobals();
});

async function setup(
  onEntryVisited?: () => void,
  rootName = 'myWorkspace',
  options: { withExternalChange?: boolean } = {},
) {
  const { commonOpts } = createTestEnvironment();
  const onChange = vi.fn();
  const onExternalChange = vi.fn();
  const rootDirHandle = new FakeDirectoryHandle(
    rootName,
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
      ...(options.withExternalChange ? { onExternalChange } : {}),
    },
  );
  await service.mount();
  return { service, onChange, onExternalChange, rootDirHandle };
}

type ObservedRecord = {
  type?: string;
  relativePathComponents?: readonly string[];
  relativePathMovedFrom?: readonly string[] | null;
  changedHandle?: { kind: string };
};

/**
 * Installs a fake `FileSystemObserver` global and returns a trigger that
 * feeds change records to whatever callback the adapter registered.
 */
function stubFileSystemObserver() {
  let capturedCallback:
    | ((records: readonly ObservedRecord[], observer: unknown) => void)
    | undefined;
  const observe = vi.fn(async () => undefined);
  const disconnect = vi.fn();

  class FakeFileSystemObserver {
    constructor(
      callback: (records: readonly ObservedRecord[], observer: unknown) => void,
    ) {
      capturedCallback = callback;
    }
    observe = observe;
    disconnect = disconnect;
  }
  vi.stubGlobal('FileSystemObserver', FakeFileSystemObserver);

  return {
    observe,
    disconnect,
    async emitRecords(records: ObservedRecord[]) {
      await vi.waitFor(() => {
        expect(capturedCallback).toBeDefined();
      });
      capturedCallback?.(records, undefined);
    },
  };
}

describe('FileStorageNativeFs', () => {
  testCrossWorkspaceRenameContract(setup);

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

  it('does not require the workspace name to match the picked folder basename', async () => {
    // The on-disk layout is root-relative: a workspace named `myWorkspace`
    // can live in a folder called anything (renamed later, duplicated
    // basenames, etc).
    const { service } = await setup(undefined, 'Some Renamed Folder');
    const wsPath = 'myWorkspace:dir/note.md';

    await service.createFile(wsPath, new File(['content'], 'note.md'));
    const file = await service.readFile(wsPath);
    expect(await file?.text()).toBe('content');
    await expect(
      service.listAllFiles('myWorkspace', new AbortController().signal),
    ).resolves.toEqual([wsPath]);
  });

  it('provider contract: writeFile refuses to create a missing file', async () => {
    const { service, onChange } = await setup();
    await expect(
      service.writeFile(
        'myWorkspace:missing.md',
        new File(['data'], 'missing.md'),
      ),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file-storage:file-does-not-exist',
      }),
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: deleteFile surfaces a missing file as a typed app error', async () => {
    const { service, onChange } = await setup();
    await expect(
      service.deleteFile('myWorkspace:missing.md'),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file-storage:file-does-not-exist',
      }),
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: rename moves content, emits one rename event, and rejects conflicts', async () => {
    const { service, onChange } = await setup();
    await service.createFile(
      'myWorkspace:a.md',
      new File(['a-content'], 'a.md'),
    );
    await service.createFile(
      'myWorkspace:taken.md',
      new File(['taken'], 'taken.md'),
    );
    onChange.mockClear();

    await expect(
      service.renameFile('myWorkspace:a.md', {
        newWsPath: 'myWorkspace:taken.md',
      }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:already-existing',
        payload: { wsPath: 'myWorkspace:taken.md' },
      }),
    });
    // A failed rename must leave both files intact.
    expect(await (await service.readFile('myWorkspace:a.md'))?.text()).toBe(
      'a-content',
    );
    expect(await (await service.readFile('myWorkspace:taken.md'))?.text()).toBe(
      'taken',
    );
    expect(onChange).not.toHaveBeenCalled();

    await service.renameFile('myWorkspace:a.md', {
      newWsPath: 'myWorkspace:sub/b.md',
    });
    expect(await service.readFile('myWorkspace:a.md')).toBeUndefined();
    expect(await (await service.readFile('myWorkspace:sub/b.md'))?.text()).toBe(
      'a-content',
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      type: 'rename',
      oldWsPath: 'myWorkspace:a.md',
      newWsPath: 'myWorkspace:sub/b.md',
    });
  });
});

describe('external change watching', () => {
  it('maps observer records for visible files to external change events', async () => {
    const observer = stubFileSystemObserver();
    const { service, onExternalChange } = await setup(
      undefined,
      'myWorkspace',
      {
        withExternalChange: true,
      },
    );

    // First storage access boots the watcher for the workspace.
    await service.fileExists('myWorkspace:seed.md');
    await vi.waitFor(() => {
      expect(observer.observe).toHaveBeenCalledTimes(1);
    });

    await observer.emitRecords([
      {
        type: 'appeared',
        relativePathComponents: ['sub', 'new.md'],
        changedHandle: { kind: 'file' },
      },
      {
        type: 'modified',
        relativePathComponents: ['existing.md'],
        changedHandle: { kind: 'file' },
      },
      {
        type: 'disappeared',
        relativePathComponents: ['gone.md'],
        changedHandle: { kind: 'file' },
      },
      {
        type: 'moved',
        relativePathComponents: ['renamed.md'],
        relativePathMovedFrom: ['old-name.md'],
        changedHandle: { kind: 'file' },
      },
    ]);

    expect(onExternalChange.mock.calls.map(([event]) => event)).toEqual([
      { type: 'create', wsPath: 'myWorkspace:sub/new.md' },
      { type: 'update', wsPath: 'myWorkspace:existing.md' },
      { type: 'delete', wsPath: 'myWorkspace:gone.md' },
      {
        type: 'rename',
        oldWsPath: 'myWorkspace:old-name.md',
        newWsPath: 'myWorkspace:renamed.md',
      },
    ]);
  });

  it("suppresses the observer echo of the app's own writes", async () => {
    const observer = stubFileSystemObserver();
    const { service, onExternalChange } = await setup(
      undefined,
      'myWorkspace',
      {
        withExternalChange: true,
      },
    );

    await service.createFile(
      'myWorkspace:mine.md',
      new File(['from the app'], 'mine.md'),
    );
    await vi.waitFor(() => {
      expect(observer.observe).toHaveBeenCalledTimes(1);
    });

    // The OS-level record produced by our own write arrives shortly after.
    await observer.emitRecords([
      {
        type: 'appeared',
        relativePathComponents: ['mine.md'],
        changedHandle: { kind: 'file' },
      },
      {
        type: 'modified',
        relativePathComponents: ['truly-external.md'],
        changedHandle: { kind: 'file' },
      },
    ]);

    // Only the genuinely external change comes through.
    expect(onExternalChange.mock.calls.map(([event]) => event)).toEqual([
      { type: 'update', wsPath: 'myWorkspace:truly-external.md' },
    ]);
  });

  it('ignores hidden paths and coalesces unmappable records into one refresh', async () => {
    const observer = stubFileSystemObserver();
    const { service, onExternalChange } = await setup(
      undefined,
      'myWorkspace',
      {
        withExternalChange: true,
      },
    );
    await service.fileExists('myWorkspace:seed.md');

    await observer.emitRecords([
      // Hidden/system files are invisible to the app: ignored entirely.
      {
        type: 'modified',
        relativePathComponents: ['.obsidian', 'config.json'],
        changedHandle: { kind: 'file' },
      },
      // Directory records and unknown/errored records only say "something
      // changed": they collapse into a single coarse refresh.
      {
        type: 'appeared',
        relativePathComponents: ['new-dir'],
        changedHandle: { kind: 'directory' },
      },
      { type: 'unknown', relativePathComponents: [] },
      { type: 'errored', relativePathComponents: [] },
    ]);

    expect(onExternalChange.mock.calls.map(([event]) => event)).toEqual([
      { type: 'refresh', wsName: 'myWorkspace' },
    ]);
  });

  it('falls back to throttled focus revalidation when the observer API is unavailable', async () => {
    // No FileSystemObserver global installed.
    const { service, onExternalChange } = await setup(
      undefined,
      'myWorkspace',
      {
        withExternalChange: true,
      },
    );
    await service.fileExists('myWorkspace:seed.md');

    await vi.waitFor(() => {
      window.dispatchEvent(new Event('focus'));
      expect(onExternalChange).toHaveBeenCalledWith({
        type: 'refresh',
        wsName: 'myWorkspace',
      });
    });

    // A second focus within the throttle window does not refresh again.
    onExternalChange.mockClear();
    window.dispatchEvent(new Event('focus'));
    expect(onExternalChange).not.toHaveBeenCalled();
  });
});
