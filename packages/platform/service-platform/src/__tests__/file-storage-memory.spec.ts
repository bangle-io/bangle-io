/**
 * @vitest-environment happy-dom
 */

import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from '@bangle.io/baby-fs';
import { FILE_STORAGE_MAX_FILE_SIZE_BYTES } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorageMemory } from '../file-storage-memory';

async function setup() {
  const { commonOpts } = createTestEnvironment();
  const onChange = vi.fn();
  const service = new FileStorageMemory(
    {
      ctx: commonOpts,
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
    },
    null,
    { onChange },
  );
  await service.mount();
  return { service, onChange };
}

describe('FileStorageMemory', () => {
  beforeEach(() => {
    // Clear internal state if needed
  });

  it('declares a memory storage file-size limit', async () => {
    const { service } = await setup();

    expect(service.maxFileSizeBytes).toBe(
      FILE_STORAGE_MAX_FILE_SIZE_BYTES.memory,
    );
  });

  it('should create and read a file', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:myNote.md';
    const file = new File(['Hello world'], 'myNote.md');

    await service.createFile(wsPath, file);
    const readFile = await service.readFile(wsPath);
    expect(readFile).toBeDefined();
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
    const file = new File(['Renamed content'], 'oldNote.md');

    await service.createFile(oldPath, file);
    await service.renameFile(oldPath, { newWsPath: newPath });

    const readFile = await service.readFile(newPath);
    expect(readFile).not.toBeUndefined();
    expect(await readFile?.text()).toBe('Renamed content');

    expect(onChange).toHaveBeenCalledWith({
      type: 'create',
      wsPath: oldPath,
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'rename',
      oldWsPath: oldPath,
      newWsPath: newPath,
    });
  });

  it('should throw error when writing file that does not exist', async () => {
    const { service } = await setup();
    const wsPath = 'myWorkspace:nonExistent.md';
    const file = new File(['No file'], 'nonExistent.md');

    await expect(service.writeFile(wsPath, file)).rejects.toThrow(
      /does not exist/,
    );
  });

  it('should delete a file and it should no longer exist', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:deleteMe.md';
    const file = new File(['Delete me'], 'deleteMe.md');

    await service.createFile(wsPath, file);
    expect(await service.fileExists(wsPath)).toBe(true);

    await service.deleteFile(wsPath);
    expect(await service.fileExists(wsPath)).toBe(false);

    expect(onChange).toHaveBeenCalledWith({
      type: 'delete',
      wsPath,
    });
  });

  it('provider contract: deleteFile throws FILE_NOT_FOUND_ERROR for a non-existent file and does not emit a change event', async () => {
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

  it('provider contract: renameFile throws FILE_NOT_FOUND_ERROR for a non-existent file and does not emit a change event or create the destination', async () => {
    const { service, onChange } = await setup();
    const oldPath = 'myWorkspace:doesNotExist.md';
    const newPath = 'myWorkspace:renamed.md';

    await expect(
      service.renameFile(oldPath, { newWsPath: newPath }),
    ).rejects.toMatchObject({
      code: FILE_NOT_FOUND_ERROR,
    });
    await expect(
      service.renameFile(oldPath, { newWsPath: newPath }),
    ).rejects.toBeInstanceOf(BaseFileSystemError);

    expect(onChange).not.toHaveBeenCalled();
    expect(await service.fileExists(newPath)).toBe(false);
  });
});
