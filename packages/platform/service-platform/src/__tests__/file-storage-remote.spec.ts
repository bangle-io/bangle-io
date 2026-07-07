/**
 * @vitest-environment happy-dom
 */

import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from '@bangle.io/baby-fs';
import { FILE_STORAGE_MAX_FILE_SIZE_BYTES } from '@bangle.io/constants';
import {
  createFetchFromRouter,
  createHttpRemoteClient,
  createRemoteRouter,
  MemoryRemoteFileStore,
  type RemoteFileStorageClient,
} from '@bangle.io/remote-file-sync';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorageRemote } from '../file-storage-remote';

async function setup(options?: {
  client?: RemoteFileStorageClient;
  now?: () => number;
}) {
  const { commonOpts } = createTestEnvironment();
  const onChange = vi.fn();
  const store = new MemoryRemoteFileStore({ now: options?.now });
  const router = createRemoteRouter(store);
  const client =
    options?.client ??
    createHttpRemoteClient({
      baseUrl: 'https://notes.test',
      fetch: createFetchFromRouter(router),
    });

  const service = new FileStorageRemote(
    {
      ctx: commonOpts,
      serviceContext: { abortSignal: commonOpts.rootAbortSignal },
    },
    null,
    { onChange, getClient: () => client },
  );
  await service.mount();
  return { service, onChange, store };
}

describe('FileStorageRemote (contract)', () => {
  beforeEach(() => {});

  it('declares the remote storage file-size limit', async () => {
    const { service } = await setup();
    expect(service.maxFileSizeBytes).toBe(
      FILE_STORAGE_MAX_FILE_SIZE_BYTES.remote,
    );
    expect(service.workspaceType).toBe('remote');
  });

  it('should create and read a file', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:myNote.md';
    await service.createFile(wsPath, new File(['Hello world'], 'myNote.md'));
    const readFile = await service.readFile(wsPath);
    expect(await readFile?.text()).toBe('Hello world');
    expect(onChange).toHaveBeenCalledWith({ type: 'create', wsPath });
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

  it('should rename and still be able to read the file', async () => {
    const { service, onChange } = await setup();
    const oldPath = 'myWorkspace:oldNote.md';
    const newPath = 'myWorkspace:newNote.md';

    await service.createFile(
      oldPath,
      new File(['Renamed content'], 'oldNote.md'),
    );
    await service.renameFile(oldPath, { newWsPath: newPath });

    const readFile = await service.readFile(newPath);
    expect(await readFile?.text()).toBe('Renamed content');
    expect(onChange).toHaveBeenCalledWith({
      type: 'rename',
      oldWsPath: oldPath,
      newWsPath: newPath,
    });
  });

  it('should throw error when writing a file that does not exist', async () => {
    const { service } = await setup();
    await expect(
      service.writeFile(
        'myWorkspace:nonExistent.md',
        new File(['No file'], 'nonExistent.md'),
      ),
    ).rejects.toThrow(/does not exist/);
  });

  it('writes update existing files and emit an update event', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:note.md';
    await service.createFile(wsPath, new File(['one'], 'note.md'));
    await service.writeFile(wsPath, new File(['two'], 'note.md'));
    expect(await (await service.readFile(wsPath))?.text()).toBe('two');
    expect(onChange).toHaveBeenCalledWith({ type: 'update', wsPath });
  });

  it('should delete a file and it should no longer exist', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:deleteMe.md';
    await service.createFile(wsPath, new File(['Delete me'], 'deleteMe.md'));
    expect(await service.fileExists(wsPath)).toBe(true);
    await service.deleteFile(wsPath);
    expect(await service.fileExists(wsPath)).toBe(false);
    expect(onChange).toHaveBeenCalledWith({ type: 'delete', wsPath });
  });

  it('provider contract: deleteFile throws FILE_NOT_FOUND_ERROR for a missing file', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:doesNotExist.md';
    await expect(service.deleteFile(wsPath)).rejects.toMatchObject({
      code: FILE_NOT_FOUND_ERROR,
    });
    await expect(service.deleteFile(wsPath)).rejects.toBeInstanceOf(
      BaseFileSystemError,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: renameFile throws FILE_NOT_FOUND_ERROR and does not create the destination', async () => {
    const { service, onChange } = await setup();
    const oldPath = 'myWorkspace:doesNotExist.md';
    const newPath = 'myWorkspace:renamed.md';
    await expect(
      service.renameFile(oldPath, { newWsPath: newPath }),
    ).rejects.toMatchObject({ code: FILE_NOT_FOUND_ERROR });
    expect(onChange).not.toHaveBeenCalled();
    expect(await service.fileExists(newPath)).toBe(false);
  });

  it('fileStat returns timestamps and throws for a missing file', async () => {
    const { service } = await setup({ now: () => 12345 });
    const wsPath = 'myWorkspace:note.md';
    await service.createFile(wsPath, new File(['x'], 'note.md'));
    expect(await service.fileStat(wsPath)).toEqual({
      ctime: 12345,
      mtime: 12345,
    });
    await expect(
      service.fileStat('myWorkspace:missing.md'),
    ).rejects.toMatchObject({
      code: FILE_NOT_FOUND_ERROR,
    });
  });

  it('listAllFiles returns workspace paths', async () => {
    const { service } = await setup();
    await service.createFile('myWorkspace:b.md', new File(['1'], 'b.md'));
    await service.createFile('myWorkspace:dir/a.md', new File(['2'], 'a.md'));
    const controller = new AbortController();
    const files = await service.listAllFiles('myWorkspace', controller.signal);
    expect(files).toEqual(['myWorkspace:b.md', 'myWorkspace:dir/a.md']);
  });

  it('surfaces transport failures as error::remote-storage:request-failed', async () => {
    const failing = createHttpRemoteClient({
      baseUrl: 'https://notes.test',
      fetch: async () => {
        throw new Error('connection refused');
      },
    });
    const { service } = await setup({ client: failing });
    const controller = new AbortController();
    await expect(
      service.listAllFiles('myWorkspace', controller.signal),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::remote-storage:request-failed',
        payload: expect.objectContaining({ code: 'network' }),
      }),
    });
  });

  it('surfaces unauthorized responses as request-failed', async () => {
    const store = new MemoryRemoteFileStore();
    const router = createRemoteRouter(store, { token: 'secret' });
    const client = createHttpRemoteClient({
      baseUrl: 'https://notes.test',
      token: 'wrong',
      fetch: createFetchFromRouter(router),
    });
    const { service } = await setup({ client });
    await expect(service.readFile('myWorkspace:note.md')).rejects.toMatchObject(
      {
        cause: expect.objectContaining({
          name: 'error::remote-storage:request-failed',
          payload: expect.objectContaining({ code: 'unauthorized' }),
        }),
      },
    );
  });
});
