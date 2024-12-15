/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileStorageMemory } from '../file-storage-memory';
import { createTestEnvironment } from '@bangle.io/test-utils';

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
      /Cannot write file as it does not exist/,
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
});
