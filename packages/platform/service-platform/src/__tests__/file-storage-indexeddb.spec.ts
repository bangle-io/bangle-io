/**
 * @vitest-environment happy-dom
 */

import { createTestEnvironment } from '@bangle.io/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorageIndexedDB } from '../file-storage-indexeddb';

async function setup() {
  const { commonOpts } = createTestEnvironment();
  const onChange = vi.fn();
  const service = new FileStorageIndexedDB(
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

describe('FileStorageIndexedDB', () => {
  beforeEach(() => {
    // indexedDB gets cleared in between tests by happy-dom
  });

  it('should create and read a file', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:myFile.txt';
    const file = new File(['IndexedDB content'], 'myFile.txt');

    await service.createFile(wsPath, file);
    const read = await service.readFile(wsPath);
    expect(read).toBeDefined();
    expect(await read?.text()).toBe('IndexedDB content');

    expect(onChange).toHaveBeenCalledWith({ type: 'create', wsPath });
  });

  it('should rename a file', async () => {
    const { service, onChange } = await setup();
    const oldPath = 'myWorkspace:oldFile.txt';
    const newPath = 'myWorkspace:newFile.txt';
    const file = new File(['Rename me'], 'oldFile.txt');

    await service.createFile(oldPath, file);
    await service.renameFile(oldPath, { newWsPath: newPath });

    const read = await service.readFile(newPath);
    expect(await read?.text()).toBe('Rename me');

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

  it('should error when writing a non-existent file', async () => {
    const { service } = await setup();
    const wsPath = 'myWorkspace:missingFile.txt';
    const file = new File(['missing'], 'missingFile.txt');

    await expect(service.writeFile(wsPath, file)).rejects.toThrow(
      /Cannot write file as it does not exist/,
    );
  });

  it('should delete a file', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:deleteMe.txt';
    const file = new File(['To be deleted'], 'deleteMe.txt');

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
