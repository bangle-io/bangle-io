import { getAppErrorCause, isAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { WsFilePath } from '@bangle.io/ws-path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NoteRelocationContentWriteError,
  type NoteRelocationEditorAdapter,
} from '../note-relocation-service';

const WS_NAME = 'test-ws';
const SOURCE_WS_PATH = `${WS_NAME}:notes/source.md`;
const DESTINATION_WS_PATH = `${WS_NAME}:archive/source.md`;
const TARGET_WS_PATH = `${WS_NAME}:notes/target.md`;

let controllers: AbortController[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  for (const controller of controllers) {
    controller.abort();
  }
  controllers = [];
});

async function setupRelocation({
  editorAdapter,
  editorEngineId,
  source = 'plain note body',
  target = 'target body',
}: {
  editorAdapter?: NoteRelocationEditorAdapter;
  editorEngineId?: 'wordgard';
  source?: string;
  target?: string;
} = {}) {
  const controller = new AbortController();
  controllers.push(controller);
  const testEnv = createTestEnvironment({
    controller,
    ...(editorEngineId ? { editorEngineId } : {}),
    ...(editorAdapter
      ? {
          coreConfigOverrides: {
            noteRelocation: (base) => ({
              ...base,
              getEditorAdapter: () => editorAdapter,
            }),
          },
        }
      : {}),
  });
  const services = testEnv.instantiateAll();
  await testEnv.mountAll();
  await services.workspaceOps.createWorkspaceInfo({
    name: WS_NAME,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });
  await services.fileSystem.createTextFile(SOURCE_WS_PATH, source);
  await services.fileSystem.createTextFile(TARGET_WS_PATH, target);

  return { services, testEnv };
}

function createEditorAdapter({
  writeError,
  writeResult = 'written',
}: {
  writeError?: Error;
  writeResult?: 'superseded' | 'unavailable' | 'written';
} = {}): NoteRelocationEditorAdapter {
  return {
    discardRelocatedMarkdownHandoff: vi.fn(),
    waitForSourceSaveDrain: vi.fn(async () => true),
    writeRelocatedMarkdown: vi.fn(async () => {
      if (writeError) {
        throw writeError;
      }
      return writeResult;
    }),
  };
}

function request({
  source = SOURCE_WS_PATH,
  destination = DESTINATION_WS_PATH,
}: {
  destination?: string;
  source?: string;
} = {}) {
  return {
    destination: WsFilePath.fromString(destination),
    source: WsFilePath.fromString(source),
  };
}

function expectAppError(error: unknown, name: string): void {
  if (!isAppError(error)) {
    throw error;
  }
  expect(getAppErrorCause(error)?.name).toBe(name);
}

describe('NoteRelocationService', () => {
  it('returns a no-op receipt without touching storage', async () => {
    const { services } = await setupRelocation();
    const readSpy = vi.spyOn(services.fileSystem, 'readFileAsText');
    const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

    await expect(
      services.noteRelocation.relocate(
        request({ destination: SOURCE_WS_PATH }),
      ),
    ).resolves.toMatchObject({
      rewrittenReferences: 0,
      warnings: [],
    });

    expect(readSpy).not.toHaveBeenCalled();
    expect(renameSpy).not.toHaveBeenCalled();
  });

  it('rejects a missing source before changing the destination', async () => {
    const { services } = await setupRelocation();
    const missing = `${WS_NAME}:notes/missing.md`;
    const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

    await services.noteRelocation
      .relocate(request({ source: missing }))
      .catch((error: unknown) => {
        expectAppError(error, 'error::file:invalid-note-path');
      });

    expect(renameSpy).not.toHaveBeenCalled();
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBeUndefined();
  });

  it('rejects a destination collision without overwriting either note', async () => {
    const { services } = await setupRelocation();
    await services.fileSystem.createTextFile(
      DESTINATION_WS_PATH,
      'destination body',
    );
    const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

    await services.noteRelocation
      .relocate(request())
      .catch((error: unknown) => {
        expectAppError(error, 'error::file:already-existing');
      });

    expect(renameSpy).not.toHaveBeenCalled();
    await expect(
      services.fileSystem.readFileAsText(SOURCE_WS_PATH),
    ).resolves.toBe('plain note body');
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe('destination body');
  });

  it('renames unchanged content without a destination write', async () => {
    const { services } = await setupRelocation();

    await expect(
      services.noteRelocation.relocate(request()),
    ).resolves.toMatchObject({ rewrittenReferences: 0, warnings: [] });

    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe('plain note body');
  });

  it('rewrites supported paths after the durable rename', async () => {
    const { services } = await setupRelocation({
      source: 'unrelated body\n\n[[./target]]',
    });

    await expect(
      services.noteRelocation.relocate(request()),
    ).resolves.toMatchObject({ rewrittenReferences: 1, warnings: [] });

    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe('unrelated body\n\n[[../notes/target.md]]');
  });

  it('keeps a changed source body instead of overwriting it with a stale rewrite plan', async () => {
    const editorAdapter = createEditorAdapter();
    const originalMarkdown = ['[[./target]]', '[[./target]]'].join('\n\n');
    const changedMarkdown = '[[./target]]';
    const { services } = await setupRelocation({
      editorAdapter,
      source: originalMarkdown,
    });
    const renameFile = services.fileSystem.renameFile.bind(services.fileSystem);
    const writeFile = services.fileSystem.writeFile.bind(services.fileSystem);
    vi.spyOn(services.fileSystem, 'renameFile').mockImplementation(
      async (args) => {
        if (args.oldWsPath === SOURCE_WS_PATH) {
          await writeFile(
            SOURCE_WS_PATH,
            new File([changedMarkdown], 'source.md', {
              type: 'text/plain',
            }),
          );
        }
        return renameFile(args);
      },
    );

    await expect(
      services.noteRelocation.relocate(request()),
    ).resolves.toMatchObject({
      rewrittenReferences: 0,
      warnings: [
        {
          kind: 'destination-content-changed',
          skippedReferences: 2,
        },
      ],
    });

    expect(editorAdapter.writeRelocatedMarkdown).not.toHaveBeenCalled();
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe(changedMarkdown);
  });

  it('preserves a newer local edit instead of applying the planned rewrite', async () => {
    const editorAdapter = createEditorAdapter({ writeResult: 'superseded' });
    const { services } = await setupRelocation({
      editorAdapter,
      source: '[[./target]]',
    });

    await expect(
      services.noteRelocation.relocate(request()),
    ).resolves.toMatchObject({
      rewrittenReferences: 0,
      warnings: [{ kind: 'newer-local-edit', skippedReferences: 1 }],
    });
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe('[[./target]]');
  });

  it('reports when the editor cannot safely apply the planned rewrite', async () => {
    const editorAdapter = createEditorAdapter({ writeResult: 'unavailable' });
    const { services } = await setupRelocation({
      editorAdapter,
      source: [
        '[[./target]]',
        '[[./target]]',
        '[Extensionless target](./target)',
      ].join('\n\n'),
    });

    await expect(
      services.noteRelocation.relocate(request()),
    ).resolves.toMatchObject({
      rewrittenReferences: 0,
      warnings: [
        { count: 1, kind: 'unsupported-reference' },
        { kind: 'editor-content-unavailable', skippedReferences: 2 },
      ],
    });
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe(
      ['[[./target]]', '[[./target]]', '[Extensionless target](./target)'].join(
        '\n\n',
      ),
    );
  });

  it('keeps the physical move and reports unavailable rewrites in the read-only engine', async () => {
    const { services } = await setupRelocation({
      editorEngineId: 'wordgard',
      source: '[[./target]]',
    });

    await expect(
      services.noteRelocation.relocate(request()),
    ).resolves.toMatchObject({
      rewrittenReferences: 0,
      warnings: [{ kind: 'editor-content-unavailable', skippedReferences: 1 }],
    });
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe('[[./target]]');
  });

  it('blocks relocation when the initiating save queue cannot drain', async () => {
    const editorAdapter = createEditorAdapter();
    vi.mocked(editorAdapter.waitForSourceSaveDrain).mockResolvedValue(false);
    const { services } = await setupRelocation({ editorAdapter });
    const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

    await services.noteRelocation
      .relocate(request())
      .catch((error: unknown) => {
        expectAppError(error, 'error::file:invalid-operation');
      });

    expect(renameSpy).not.toHaveBeenCalled();
    await expect(
      services.fileSystem.readFileAsText(SOURCE_WS_PATH),
    ).resolves.toBe('plain note body');
  });

  it('restores the original path when the rewritten destination write fails', async () => {
    const editorAdapter = createEditorAdapter({
      writeError: new Error('destination write failed'),
    });
    const { services } = await setupRelocation({
      editorAdapter,
      source: '[[./target]]',
    });

    let caught: unknown;
    try {
      await services.noteRelocation.relocate(request());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(NoteRelocationContentWriteError);
    expect(caught).toMatchObject({ compensation: 'restored' });
    await expect(
      services.fileSystem.readFileAsText(SOURCE_WS_PATH),
    ).resolves.toBe('[[./target]]');
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBeUndefined();
  });

  it('reports unsuccessful write-failure compensation without deleting the destination', async () => {
    const editorAdapter = createEditorAdapter({
      writeError: new Error('destination write failed'),
    });
    const { services } = await setupRelocation({
      editorAdapter,
      source: '[[./target]]',
    });
    const renameFile = services.fileSystem.renameFile.bind(services.fileSystem);
    vi.spyOn(services.fileSystem, 'renameFile').mockImplementation((args) => {
      if (args.oldWsPath === DESTINATION_WS_PATH) {
        return Promise.reject(new Error('restore failed'));
      }
      return renameFile(args);
    });

    let caught: unknown;
    try {
      await services.noteRelocation.relocate(request());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(NoteRelocationContentWriteError);
    expect(caught).toMatchObject({ compensation: 'failed' });
    await expect(
      services.fileSystem.readFileAsText(SOURCE_WS_PATH),
    ).resolves.toBe(undefined);
    await expect(
      services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
    ).resolves.toBe('[[./target]]');
  });
});
