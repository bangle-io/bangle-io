import { isAbortError } from '@bangle.io/mini-js-utils';
import type { BaseFileStorageProvider } from '@bangle.io/types';
import { expect, it } from 'vitest';

type ChangeRecorder = {
  mockClear(): void;
};

type ProviderSetup = {
  service: BaseFileStorageProvider;
  onChange: ChangeRecorder;
};

const EMPTY_OPTIONS = {};

async function readText(
  service: BaseFileStorageProvider,
  wsPath: string,
): Promise<string | undefined> {
  return (await service.readFile(wsPath, EMPTY_OPTIONS))?.text();
}

async function expectMissingFile(
  operation: Promise<unknown>,
  wsPath: string,
): Promise<void> {
  await expect(operation).rejects.toMatchObject({
    cause: expect.objectContaining({
      name: 'error::file-storage:file-does-not-exist',
      payload: expect.objectContaining({ wsPath }),
    }),
  });
}

export function testFileStorageProviderContract(
  setup: () => Promise<ProviderSetup>,
): void {
  it('provider contract: creates, reads, and finds a file with exactly one event', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:create.md';

    await expect(
      service.readFile(wsPath, EMPTY_OPTIONS),
    ).resolves.toBeUndefined();
    await expect(service.fileExists(wsPath, EMPTY_OPTIONS)).resolves.toBe(
      false,
    );

    await service.createFile(
      wsPath,
      new File(['created'], 'create.md'),
      EMPTY_OPTIONS,
    );

    await expect(readText(service, wsPath)).resolves.toBe('created');
    await expect(service.fileExists(wsPath, EMPTY_OPTIONS)).resolves.toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ type: 'create', wsPath });
  });

  it('provider contract: duplicate create preserves content and emits no event', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:duplicate.md';
    await service.createFile(
      wsPath,
      new File(['original'], 'duplicate.md'),
      EMPTY_OPTIONS,
    );
    onChange.mockClear();

    await expect(
      service.createFile(
        wsPath,
        new File(['replacement'], 'duplicate.md'),
        EMPTY_OPTIONS,
      ),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:already-existing',
        payload: { wsPath },
      }),
    });

    await expect(readText(service, wsPath)).resolves.toBe('original');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: writes an existing file with exactly one event', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:write.md';
    await service.createFile(
      wsPath,
      new File(['before'], 'write.md'),
      EMPTY_OPTIONS,
    );
    onChange.mockClear();

    await service.writeFile(
      wsPath,
      new File(['after'], 'write.md'),
      EMPTY_OPTIONS,
    );

    await expect(readText(service, wsPath)).resolves.toBe('after');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ type: 'update', wsPath });
  });

  it('provider contract: writing a missing file rejects without creating or emitting', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:missing-write.md';

    await expectMissingFile(
      service.writeFile(
        wsPath,
        new File(['data'], 'missing-write.md'),
        EMPTY_OPTIONS,
      ),
      wsPath,
    );

    await expect(
      service.readFile(wsPath, EMPTY_OPTIONS),
    ).resolves.toBeUndefined();
    await expect(service.fileExists(wsPath, EMPTY_OPTIONS)).resolves.toBe(
      false,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: deletes an existing file with exactly one event', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:delete.md';
    await service.createFile(
      wsPath,
      new File(['delete'], 'delete.md'),
      EMPTY_OPTIONS,
    );
    onChange.mockClear();

    await service.deleteFile(wsPath, EMPTY_OPTIONS);

    await expect(
      service.readFile(wsPath, EMPTY_OPTIONS),
    ).resolves.toBeUndefined();
    await expect(service.fileExists(wsPath, EMPTY_OPTIONS)).resolves.toBe(
      false,
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ type: 'delete', wsPath });
  });

  it('provider contract: deleting a missing file rejects without emitting', async () => {
    const { service, onChange } = await setup();
    const wsPath = 'myWorkspace:missing-delete.md';

    await expectMissingFile(service.deleteFile(wsPath, EMPTY_OPTIONS), wsPath);

    await expect(service.fileExists(wsPath, EMPTY_OPTIONS)).resolves.toBe(
      false,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: renames a file with exactly one event', async () => {
    const { service, onChange } = await setup();
    const source = 'myWorkspace:rename-source.md';
    const destination = 'myWorkspace:nested/rename-destination.md';
    await service.createFile(
      source,
      new File(['rename'], 'rename-source.md'),
      EMPTY_OPTIONS,
    );
    onChange.mockClear();

    await service.renameFile(source, { newWsPath: destination });

    await expect(
      service.readFile(source, EMPTY_OPTIONS),
    ).resolves.toBeUndefined();
    await expect(readText(service, destination)).resolves.toBe('rename');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      type: 'rename',
      oldWsPath: source,
      newWsPath: destination,
    });
  });

  it('provider contract: rename destination conflicts preserve both files without emitting', async () => {
    const { service, onChange } = await setup();
    const source = 'myWorkspace:conflict-source.md';
    const destination = 'myWorkspace:conflict-destination.md';
    await service.createFile(
      source,
      new File(['source'], 'conflict-source.md'),
      EMPTY_OPTIONS,
    );
    await service.createFile(
      destination,
      new File(['destination'], 'conflict-destination.md'),
      EMPTY_OPTIONS,
    );
    onChange.mockClear();

    await expect(
      service.renameFile(source, { newWsPath: destination }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:already-existing',
        payload: { wsPath: destination },
      }),
    });

    await expect(readText(service, source)).resolves.toBe('source');
    await expect(readText(service, destination)).resolves.toBe('destination');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: renaming a missing file rejects without creating or emitting', async () => {
    const { service, onChange } = await setup();
    const source = 'myWorkspace:missing-rename.md';
    const destination = 'myWorkspace:unexpected-destination.md';

    await expectMissingFile(
      service.renameFile(source, { newWsPath: destination }),
      source,
    );

    await expect(
      service.readFile(destination, EMPTY_OPTIONS),
    ).resolves.toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: cross-workspace rename rejects without changing storage', async () => {
    const { service, onChange } = await setup();
    const source = 'myWorkspace:cross-workspace.md';
    const destination = 'otherWorkspace:cross-workspace.md';
    await service.createFile(
      source,
      new File(['source'], 'cross-workspace.md'),
      EMPTY_OPTIONS,
    );
    onChange.mockClear();

    await expect(
      service.renameFile(source, { newWsPath: destination }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:invalid-operation',
        payload: {
          operation: 'rename',
          oldWsPath: source,
          newWsPath: destination,
        },
      }),
    });

    await expect(readText(service, source)).resolves.toBe('source');
    await expect(
      service.readFile(destination, EMPTY_OPTIONS),
    ).resolves.toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('provider contract: lists only the exact workspace in sorted order', async () => {
    const { service } = await setup();
    await service.createFile(
      'notes:zeta.md',
      new File(['zeta'], 'zeta.md'),
      EMPTY_OPTIONS,
    );
    await service.createFile(
      'notes:alpha.md',
      new File(['alpha'], 'alpha.md'),
      EMPTY_OPTIONS,
    );
    await service.createFile(
      'notes-archive:foreign.md',
      new File(['foreign'], 'foreign.md'),
      EMPTY_OPTIONS,
    );

    await expect(
      service.listAllFiles(
        'notes',
        new AbortController().signal,
        EMPTY_OPTIONS,
      ),
    ).resolves.toEqual(['notes:alpha.md', 'notes:zeta.md']);
  });

  it('provider contract: an already-aborted listing rejects with an abort error', async () => {
    const { service } = await setup();
    const abortController = new AbortController();
    abortController.abort();

    const error = await service
      .listAllFiles('myWorkspace', abortController.signal, EMPTY_OPTIONS)
      .catch((cause: unknown) => cause);

    expect(isAbortError(error)).toBe(true);
  });

  it('provider contract: stats an existing file and types a missing stat', async () => {
    const { service } = await setup();
    const wsPath = 'myWorkspace:stat.md';
    await service.createFile(
      wsPath,
      new File(['stat'], 'stat.md'),
      EMPTY_OPTIONS,
    );

    const stat = await service.fileStat(wsPath, EMPTY_OPTIONS);
    expect(Number.isFinite(stat.ctime)).toBe(true);
    expect(Number.isFinite(stat.mtime)).toBe(true);
    expect(stat.ctime).toBeGreaterThan(0);
    expect(stat.mtime).toBeGreaterThan(0);

    const missingPath = 'myWorkspace:missing-stat.md';
    await expectMissingFile(
      service.fileStat(missingPath, EMPTY_OPTIONS),
      missingPath,
    );
  });
}
