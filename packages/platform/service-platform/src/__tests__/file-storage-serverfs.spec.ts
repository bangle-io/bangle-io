/**
 * @vitest-environment happy-dom
 */

import { type BaseError, getAppErrorCause } from '@bangle.io/base-utils';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorageServerFs } from '../file-storage-serverfs';

async function setup() {
  const { commonOpts } = createTestEnvironment();
  const onChange = vi.fn();
  const service = new FileStorageServerFs(
    {
      ctx: commonOpts,
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
    },
    null,
    { onChange, baseUrl: '/api/server-fs' },
  );
  await service.mount();
  return { service, onChange };
}

describe('FileStorageServerFs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and reads a file', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'test-ws:folder/test.md';
    const file = new File(['hello'], 'test.md', { type: 'text/markdown' });

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(
        new Response('hello', {
          status: 200,
          headers: {
            'content-type': 'text/markdown',
            'x-file-name': 'test.md',
            'x-last-modified': '1000',
          },
        }),
      );

    await service.createFile(wsPath, file);
    const read = await service.readFile(wsPath);

    expect(await read?.text()).toBe('hello');
    expect(onChange).toHaveBeenCalledWith({ type: 'create', wsPath });
  });

  it('returns undefined when a file does not exist', async () => {
    const { service } = await setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    await expect(
      service.readFile('test-ws:missing.md'),
    ).resolves.toBeUndefined();
  });

  it('maps create conflicts to the already-existing app error', async () => {
    const { service } = await setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('File already exists', { status: 409 }),
    );

    await expect(
      service.createFile('test-ws:existing.md', new File(['x'], 'existing.md')),
    ).rejects.toSatisfy(
      (error: unknown) =>
        getAppErrorCause(error as BaseError)?.name ===
        'error::file:already-existing',
    );
  });

  it('renames files via HTTP endpoint', async () => {
    const { service, onChange } = await setup();
    const oldWsPath = 'test-ws:old.md';
    const newWsPath = 'test-ws:new.md';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, value: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await service.renameFile(oldWsPath, { newWsPath });

    expect(onChange).toHaveBeenCalledWith({
      type: 'rename',
      oldWsPath,
      newWsPath,
    });
  });

  it('maps rename conflicts to the already-existing app error', async () => {
    const { service } = await setup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('File already exists', { status: 409 }),
    );

    await expect(
      service.renameFile('test-ws:old.md', { newWsPath: 'test-ws:new.md' }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        getAppErrorCause(error as BaseError)?.name ===
        'error::file:already-existing',
    );
  });
});
