// @vitest-environment jsdom

import {
  EXTERNAL_FILE_CHANGE_SENDER_TAG,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { toast } from '@bangle.io/ui-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalContentSync } from '../external-content-sync';
import { PmEditorService } from '../pm-editor-service';

function asPmEditor(editorEngine: unknown): PmEditorService {
  if (!(editorEngine instanceof PmEditorService)) {
    throw new Error('expected the ProseMirror editor engine');
  }
  return editorEngine;
}

/**
 * Waits long enough that "the editor did not change" proves the sync refused
 * rather than simply not having run yet. Derived from the sync's own timings,
 * so tuning them cannot turn these negative assertions vacuous.
 */
function settleReconcile(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ExternalContentSync.RECONCILE_SETTLE_MS),
  );
}

const WS_NAME = 'test-ws';
const NOTE_WS_PATH = `${WS_NAME}:note.md`;
/**
 * A link reference definition nothing resolves against. The parser consumes it
 * and emits nothing, so applying this would silently drop content the user can
 * still see on disk — the one class the auto-apply gate refuses.
 */
const REFUSED_SOURCE = 'see the spec\n\n[unused]: https://example.com/spec\n';
/**
 * Soft-wrapped prose: reformats on save, but parsing keeps everything. This
 * must auto-apply rather than leave the editor stale.
 */
const REFLOWED_SOURCE =
  '- Standup notes:\n  https://example.com/standup\n- second item\n';
const STALE_TOAST_ID = `external-stale-content:${NOTE_WS_PATH}`;
const EXTERNAL_SENDER = {
  id: 'other-source',
  tag: EXTERNAL_FILE_CHANGE_SENDER_TAG,
};

let cleanupControllers: AbortController[] = [];
let cleanupDomNodes: HTMLElement[] = [];

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const controller of cleanupControllers) {
    controller.abort();
  }
  cleanupControllers = [];
  for (const domNode of cleanupDomNodes) {
    domNode.remove();
  }
  cleanupDomNodes = [];
});

async function setupEditorWithNote(initialContent: string) {
  const controller = new AbortController();
  cleanupControllers.push(controller);
  const testEnv = createTestEnvironment({ controller });
  const services = testEnv.instantiateAll();
  await testEnv.mountAll();

  await services.workspaceOps.createWorkspaceInfo({
    name: WS_NAME,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });
  await services.fileSystem.createTextFile(NOTE_WS_PATH, initialContent);

  const domNode = document.createElement('div');
  document.body.append(domNode);
  cleanupDomNodes.push(domNode);

  const unmountEditor = services.editorEngine.mountEditor({
    domNode,
    wsPath: NOTE_WS_PATH,
    name: 'main-test-editor',
    focus: false,
  });
  await vi.waitFor(() => {
    expect(editorText(domNode)).toContain('the original note body');
  });

  return { controller, testEnv, services, domNode, unmountEditor };
}

// `mountEditor` turns the passed node itself into the contenteditable
// ProseMirror root, so the editor content is the node's own content.
function editorText(domNode: HTMLElement): string {
  return domNode.textContent ?? '';
}

/**
 * Simulates a sync tool changing the file on disk: the storage adapter is
 * written to directly (no FileSystemService events fire), then the tagged
 * external event that a storage watcher would produce is emitted.
 */
async function simulateExternalEdit(
  testEnv: Awaited<ReturnType<typeof setupEditorWithNote>>['testEnv'],
  services: Awaited<ReturnType<typeof setupEditorWithNote>>['services'],
  content: string,
) {
  await services.fileStorageMemory.writeFile(
    NOTE_WS_PATH,
    new File([content], 'note.md', { type: 'text/plain' }),
  );
  testEnv.rootEmitter.emit('event::file:update', {
    type: 'file-content-update',
    wsPath: NOTE_WS_PATH,
    sender: EXTERNAL_SENDER,
  });
}

async function simulateRefusedExternalEdit(
  testEnv: Awaited<ReturnType<typeof setupEditorWithNote>>['testEnv'],
  services: Awaited<ReturnType<typeof setupEditorWithNote>>['services'],
) {
  const warningSpy = vi.spyOn(toast, 'warning');
  await simulateExternalEdit(testEnv, services, REFUSED_SOURCE);
  await vi.waitFor(() => expect(warningSpy).toHaveBeenCalled(), {
    timeout: 3_000,
  });
  return warningSpy;
}

describe('editor refresh on external file changes', () => {
  it('replaces a clean editor with the external content without re-saving it', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const writeSpy = vi.spyOn(services.fileSystem, 'writeFile');

    await simulateExternalEdit(
      testEnv,
      services,
      'updated by a sync tool elsewhere',
    );

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain(
          'updated by a sync tool elsewhere',
        );
        expect(editorText(domNode)).not.toContain('the original note body');
      },
      { timeout: 3_000 },
    );

    // Applying external content must not bounce a save back to storage —
    // that write would churn the file's mtime and make sync tools loop.
    expect(writeSpy).not.toHaveBeenCalled();

    const snapshots = await services.noteSnapshot.listSnapshots();
    expect(snapshots).toHaveLength(1);
    await expect(
      services.noteSnapshot.getSnapshot(snapshots[0]?.id ?? ''),
    ).resolves.toMatchObject({ content: 'the original note body' });
  });

  it('snapshots the exact loaded Markdown when external content replaces a lossy clean document', async () => {
    const originalSource =
      'the original note body\n\n[unused]: https://example.com/original\n';
    const { testEnv, services, domNode } =
      await setupEditorWithNote(originalSource);

    await simulateExternalEdit(
      testEnv,
      services,
      'updated by a sync tool elsewhere',
    );

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain(
          'updated by a sync tool elsewhere',
        );
      },
      { timeout: 3_000 },
    );

    const snapshots = await services.noteSnapshot.listSnapshots();
    expect(snapshots).toHaveLength(1);
    await expect(
      services.noteSnapshot.getSnapshot(snapshots[0]?.id ?? ''),
    ).resolves.toMatchObject({ content: originalSource });
  });

  it('retries the replacement when snapshot preservation fails', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const preserveSpy = vi
      .spyOn(services.noteSnapshot, 'preserveExternalOverwrite')
      .mockResolvedValueOnce('retry');

    await simulateExternalEdit(testEnv, services, 'externally updated');

    await vi.waitFor(
      () => {
        expect(preserveSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(editorText(domNode)).toContain('externally updated');
      },
      { timeout: 4_000 },
    );
    const snapshots = await services.noteSnapshot.listSnapshots();
    await expect(
      services.noteSnapshot.getSnapshot(snapshots[0]?.id ?? ''),
    ).resolves.toMatchObject({ content: 'the original note body' });
  });

  it('also refreshes on an external coarse refresh (force-update) event', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    await services.fileStorageMemory.writeFile(
      NOTE_WS_PATH,
      new File(['content after coarse refresh'], 'note.md', {
        type: 'text/plain',
      }),
    );
    testEnv.rootEmitter.emit('event::file:force-update', {
      sender: EXTERNAL_SENDER,
    });

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain('content after coarse refresh');
      },
      { timeout: 3_000 },
    );
  });

  it('never clobbers unsaved editor content: pending edits win over the external copy', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Wedge the save pipeline so the user's edit stays pending/unsaved.
    // Resolvable at the end: the save queue store is a module-level
    // singleton (production wiring), so a forever-pending entry would leak
    // a dirty state for this wsPath into later tests.
    let releaseSave = () => {};
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        }),
    );

    // Simulate the user typing (inserts at the current selection and
    // enqueues a save, which now hangs).
    expect(
      services.editorEngine.insertMarkdownAtSelection('USER-UNSAVED-EDIT'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(editorText(domNode)).toContain('USER-UNSAVED-EDIT');
    });

    await simulateExternalEdit(
      testEnv,
      services,
      'external content that must not win',
    );

    // Give the sync path ample opportunity to (incorrectly) run — well past
    // its quiet-period and stability-read delays.
    await settleReconcile();

    expect(editorText(domNode)).toContain('USER-UNSAVED-EDIT');
    expect(editorText(domNode)).not.toContain(
      'external content that must not win',
    );

    // Unwedge the save so the shared queue store returns to clean.
    releaseSave();
    await vi.waitFor(() => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
    });
  });

  it('keeps pending editor content on its original path across a foreign-tab rename', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const renamedWsPath = `${WS_NAME}:renamed.md`;
    const pendingWrites: Array<() => void> = [];
    const writeSpy = vi
      .spyOn(services.fileSystem, 'writeFile')
      .mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            pendingWrites.push(resolve);
          }),
      );

    expect(
      services.editorEngine.insertMarkdownAtSelection('FIRST-LOCAL-EDIT'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(writeSpy).toHaveBeenCalledTimes(1);
    });

    await services.fileStorageMemory.renameFile(NOTE_WS_PATH, {
      newWsPath: renamedWsPath,
    });
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-rename',
      oldWsPath: NOTE_WS_PATH,
      wsPath: renamedWsPath,
      sender: { id: 'another-tab', tag: 'file-system' },
    });

    expect(
      asPmEditor(services.editorEngine).getEditorLoadStatus('main-test-editor'),
    ).toMatchObject({ status: 'ready', wsPath: NOTE_WS_PATH });
    const editorView = asPmEditor(services.editorEngine).getEditor(
      'main-test-editor',
    );
    expect(editorView).toBeDefined();
    editorView?.dispatch(editorView.state.tr.insertText('SECOND-LOCAL-EDIT'));
    expect(editorText(domNode)).toContain('FIRST-LOCAL-EDIT');
    expect(editorText(domNode)).toContain('SECOND-LOCAL-EDIT');

    pendingWrites.shift()?.();
    await vi.waitFor(() => {
      expect(writeSpy).toHaveBeenCalledTimes(2);
    });
    expect(writeSpy.mock.calls.map(([wsPath]) => wsPath)).toEqual([
      NOTE_WS_PATH,
      NOTE_WS_PATH,
    ]);
    pendingWrites.shift()?.();
    await vi.waitFor(() => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
    });
  });

  it('does not apply a transient mid-write read; it settles on the final content', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Simulate a truncate-then-write external editor: the first read after
    // the watcher event sees an empty file, later reads see the final
    // content. The empty snapshot must never reach the editor.
    const realRead = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    const readSpy = vi
      .spyOn(services.fileSystem, 'readFileAsText')
      .mockImplementation(realRead);
    readSpy.mockImplementationOnce(async () => '');

    await simulateExternalEdit(testEnv, services, 'final synced content');

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain('final synced content');
      },
      { timeout: 3_000 },
    );
    // The transient empty read never replaced the doc: had it been applied,
    // the placeholder-empty doc would have been visible and, worse, the
    // final content would only arrive via a second watcher event that this
    // simulation never sends.
  });

  it('applies external content to a note loaded after another note primed the markdown loader', async () => {
    // Regression: markdown loaders are schema-bound and every editor builds
    // its own schema. Loading one note first (its load-time fidelity check
    // primes the loader) must not make a later note's external sync parse
    // with a foreign schema — that silently produced an empty document.
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    const otherWsPath = `${WS_NAME}:other.md`;
    await services.fileSystem.createTextFile(otherWsPath, 'other note');
    const otherDomNode = document.createElement('div');
    document.body.append(otherDomNode);
    cleanupDomNodes.push(otherDomNode);
    services.editorEngine.mountEditor({
      domNode: otherDomNode,
      wsPath: otherWsPath,
      name: 'second-test-editor',
      focus: false,
    });
    await vi.waitFor(() => {
      expect(otherDomNode.textContent).toContain('other note');
    });

    await services.fileStorageMemory.writeFile(
      otherWsPath,
      new File(['other note updated externally'], 'other.md', {
        type: 'text/plain',
      }),
    );
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: otherWsPath,
      sender: EXTERNAL_SENDER,
    });

    await vi.waitFor(
      () => {
        expect(otherDomNode.textContent).toContain(
          'other note updated externally',
        );
      },
      { timeout: 3_000 },
    );
    // The first editor is untouched.
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('refuses external content whose parse drops what the user can see', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // The parser consumes an unresolved link reference definition and emits
    // nothing, so applying this would arm the user's next keystroke to delete
    // a line that is still on disk.
    await simulateRefusedExternalEdit(testEnv, services);
    expect(editorText(domNode)).toContain('the original note body');
    expect(editorText(domNode)).not.toContain('see the spec');
  });

  it('auto-applies a resolved reference link', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const warningSpy = vi.spyOn(toast, 'warning');

    // A definition that a link resolves against survives the parse as that
    // link's target, so nothing is lost. This is the largest class of real
    // Markdown the byte comparison alone used to leave permanently stale.
    await simulateExternalEdit(
      testEnv,
      services,
      'see [the spec][ref]\n\n[ref]: https://example.com/spec\n',
    );

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain('the spec');
      },
      { timeout: 3_000 },
    );
    expect(editorText(domNode)).not.toContain('the original note body');
    expect(warningSpy).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: STALE_TOAST_ID }),
    );
  });

  it('auto-applies external content that only reformats on save', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const warningSpy = vi.spyOn(toast, 'warning');
    const writeSpy = vi.spyOn(services.fileSystem, 'writeFile');

    // Soft-wrapped list items serialize to one line, so this never round-trips
    // byte-for-byte — but parsing keeps every word. Refusing it would leave the
    // editor stale on a large share of ordinary hand-written Markdown.
    await simulateExternalEdit(testEnv, services, REFLOWED_SOURCE);

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain('Standup notes');
      },
      { timeout: 3_000 },
    );
    expect(editorText(domNode)).toContain('second item');
    // Applying must not write back, and must not raise the stale-content
    // notice — the fidelity notice covers the reformat-on-save warning.
    expect(writeSpy).not.toHaveBeenCalled();
    expect(warningSpy).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: STALE_TOAST_ID }),
    );
    // The reformat risk is surfaced through the fidelity notice instead.
    expect(
      testEnv.store.get(asPmEditor(services.editorEngine).$roundTripWarnings),
    ).toContain(NOTE_WS_PATH);
  });

  it('applies a serializer-equal external change so the fidelity baseline follows disk', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      '- the original note body\n',
    );
    const warningSpy = vi.spyOn(toast, 'warning');
    const writeSpy = vi.spyOn(services.fileSystem, 'writeFile');

    // `* item` parses to the same document as `- item`, so the serializer
    // comparison alone calls this an echo. But disk now holds different bytes:
    // without refreshing the retained baseline and fidelity notice, the next
    // local save would silently revert the external author's formatting.
    await simulateExternalEdit(testEnv, services, '* the original note body\n');

    await vi.waitFor(
      () => {
        expect(
          testEnv.store.get(
            asPmEditor(services.editorEngine).$roundTripWarnings,
          ),
        ).toContain(NOTE_WS_PATH);
      },
      { timeout: 3_000 },
    );
    expect(editorText(domNode)).toContain('the original note body');
    // Applying is not a save — nothing may bounce back to storage — and a
    // visually identical document is no reason for a conflict notice.
    expect(writeSpy).not.toHaveBeenCalled();
    expect(warningSpy).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: STALE_TOAST_ID }),
    );
    // The pre-change bytes stay recoverable.
    const snapshots = await services.noteSnapshot.listSnapshots();
    expect(snapshots).toHaveLength(1);
    await expect(
      services.noteSnapshot.getSnapshot(snapshots[0]?.id ?? ''),
    ).resolves.toMatchObject({ content: '- the original note body\n' });
  });

  it('refuses dropped content even when it serializes like the open document', async () => {
    const { testEnv, services } = await setupEditorWithNote(
      'the original note body with [the spec](https://example.com/spec)',
    );
    const warningSpy = vi.spyOn(toast, 'warning');

    // Serializes identically to the open document — the unused definition is
    // the only difference, and it vanishes. The refusal must outrank the
    // serializer-equality no-op.
    await simulateExternalEdit(
      testEnv,
      services,
      'the original note body with [the spec](https://example.com/spec)\n\n[unused]: https://example.com/other\n',
    );

    await vi.waitFor(
      () => {
        expect(warningSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            id: `external-stale-content:${NOTE_WS_PATH}`,
          }),
        );
      },
      { timeout: 3_000 },
    );
  });

  it('does not report unchanged lossy source as a coarse-refresh conflict', async () => {
    const { testEnv } = await setupEditorWithNote(
      'the original note body with [the spec][1]\n\n[1]: https://example.com/spec\n',
    );
    const warningSpy = vi.spyOn(toast, 'warning');

    testEnv.rootEmitter.emit('event::file:force-update', {
      sender: EXTERNAL_SENDER,
    });

    await settleReconcile();
    expect(warningSpy).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        id: `external-stale-content:${NOTE_WS_PATH}`,
      }),
    );
  });

  it('does not replace an editor when IME composition starts during preservation', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const editorView = asPmEditor(services.editorEngine).getEditor(
      'main-test-editor',
    );
    expect(editorView).toBeDefined();
    if (!editorView) {
      throw new Error('expected mounted editor');
    }

    const preservationStarted = createDeferred<void>();
    const allowPreservation = createDeferred<void>();
    const originalPreserve =
      services.noteSnapshot.preserveExternalOverwrite.bind(
        services.noteSnapshot,
      );
    let firstCall = true;
    vi.spyOn(
      services.noteSnapshot,
      'preserveExternalOverwrite',
    ).mockImplementation(async (...args) => {
      if (firstCall) {
        firstCall = false;
        preservationStarted.resolve();
        await allowPreservation.promise;
      }
      return originalPreserve(...args);
    });

    await simulateExternalEdit(
      testEnv,
      services,
      'updated while composition begins',
    );
    await preservationStarted.promise;
    let composing = true;
    Object.defineProperty(editorView, 'composing', {
      configurable: true,
      get: () => composing,
    });
    allowPreservation.resolve();

    await settleReconcile();
    expect(editorText(domNode)).toContain('the original note body');
    expect(editorText(domNode)).not.toContain(
      'updated while composition begins',
    );

    composing = false;
    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain(
          'updated while composition begins',
        );
      },
      { timeout: 4_000 },
    );
    Reflect.deleteProperty(editorView, 'composing');
  });

  it('does not replace or save a view renamed during preservation', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const preservationStarted = createDeferred<void>();
    const allowPreservation = createDeferred<void>();
    const originalPreserve =
      services.noteSnapshot.preserveExternalOverwrite.bind(
        services.noteSnapshot,
      );
    vi.spyOn(
      services.noteSnapshot,
      'preserveExternalOverwrite',
    ).mockImplementation(async (...args) => {
      preservationStarted.resolve();
      await allowPreservation.promise;
      return originalPreserve(...args);
    });
    const writeSpy = vi.spyOn(services.fileSystem, 'writeFile');

    await simulateExternalEdit(
      testEnv,
      services,
      'external content from the old path',
    );
    await preservationStarted.promise;
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-rename',
      oldWsPath: NOTE_WS_PATH,
      wsPath: `${WS_NAME}:renamed.md`,
      sender: EXTERNAL_SENDER,
    });
    allowPreservation.resolve();

    await settleReconcile();
    expect(editorText(domNode)).toContain('the original note body');
    expect(editorText(domNode)).not.toContain(
      'external content from the old path',
    );
    expect(writeSpy).not.toHaveBeenCalled();
    expect(
      asPmEditor(services.editorEngine).getEditorLoadStatus('main-test-editor'),
    ).toMatchObject({ wsPath: `${WS_NAME}:renamed.md` });
  });

  it('never blanks a non-empty note from an external truncation', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // A truncate-then-write writer can stay empty across both stability
    // reads. Emptying the note is the destructive shape of that race, so it
    // is never auto-applied.
    await simulateExternalEdit(testEnv, services, '');

    await settleReconcile();
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('a workspace-scoped refresh does not touch editors in other workspaces', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Mount a second editor in a different workspace.
    const OTHER_WS = 'other-ws';
    await services.workspaceOps.createWorkspaceInfo({
      name: OTHER_WS,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    const otherWsPath = `${OTHER_WS}:note.md`;
    await services.fileSystem.createTextFile(otherWsPath, 'other ws note');
    const otherDomNode = document.createElement('div');
    document.body.append(otherDomNode);
    cleanupDomNodes.push(otherDomNode);
    services.editorEngine.mountEditor({
      domNode: otherDomNode,
      wsPath: otherWsPath,
      name: 'other-ws-editor',
      focus: false,
    });
    await vi.waitFor(() => {
      expect(otherDomNode.textContent).toContain('other ws note');
    });

    // Change BOTH notes on storage, then send a refresh scoped to OTHER_WS.
    await services.fileStorageMemory.writeFile(
      NOTE_WS_PATH,
      new File(['changed but out of scope'], 'note.md', {
        type: 'text/plain',
      }),
    );
    await services.fileStorageMemory.writeFile(
      otherWsPath,
      new File(['other ws refreshed'], 'note.md', { type: 'text/plain' }),
    );
    testEnv.rootEmitter.emit('event::file:force-update', {
      wsName: OTHER_WS,
      sender: EXTERNAL_SENDER,
    });

    await vi.waitFor(
      () => {
        expect(otherDomNode.textContent).toContain('other ws refreshed');
      },
      { timeout: 3_000 },
    );
    // The first workspace's editor was outside the refresh scope: untouched
    // even though its file changed on storage.
    expect(editorText(domNode)).toContain('the original note body');
    expect(editorText(domNode)).not.toContain('changed but out of scope');
  });

  it('leaves the editor untouched when the external content is identical (echo)', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    const docBefore = domNode.innerHTML;

    await simulateExternalEdit(testEnv, services, 'the original note body\n');
    await settleReconcile();

    expect(domNode.innerHTML).toBe(docBefore);
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('leaves a locally saved parse-normalized document untouched when its watcher echo arrives', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const editor = asPmEditor(services.editorEngine).getEditor(
      'main-test-editor',
    );
    expect(editor).toBeDefined();
    if (!editor) {
      return;
    }

    editor.dispatch(
      editor.state.tr.insertText(
        'xyz   ',
        1,
        editor.state.doc.content.size - 1,
      ),
    );
    await vi.waitFor(async () => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
      await expect(
        services.fileSystem.readFileAsText(NOTE_WS_PATH),
      ).resolves.toBe('xyz   ');
    });

    const docBefore = editor.state.doc;
    const selectionBefore = editor.state.selection;
    expect(editorText(domNode)).toBe('xyz   ');

    // Native FS observers cannot distinguish this app's just-completed write
    // from a foreign update, so the adapter deliberately forwards the record.
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: NOTE_WS_PATH,
      sender: EXTERNAL_SENDER,
    });
    await settleReconcile();

    expect(editor.state.doc).toBe(docBefore);
    expect(editor.state.selection.eq(selectionBefore)).toBe(true);
    expect(editorText(domNode)).toBe('xyz   ');
    await expect(
      services.fileSystem.readFileAsText(NOTE_WS_PATH),
    ).resolves.toBe('xyz   ');
  });

  it('surfaces a refusal as a per-note warning toast and withdraws it once reconciled', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    // Content the fidelity gate refuses: without a user-visible surface the
    // editor would silently show older content than disk forever.
    const warningSpy = await simulateRefusedExternalEdit(testEnv, services);
    const [message, options] = warningSpy.mock.calls[0] ?? [];
    expect(String(message)).toContain('note.md');
    expect(options?.id).toBe(STALE_TOAST_ID);
    // The refusal itself still holds — the editor keeps the current note.
    expect(editorText(domNode)).toContain('the original note body');

    // The sync tool then writes content the editor can apply: the stale
    // notice is withdrawn instead of lingering over reconciled state.
    await simulateExternalEdit(
      testEnv,
      services,
      'clean content after the conflict',
    );
    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain(
          'clean content after the conflict',
        );
      },
      { timeout: 3_000 },
    );
    expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);
  });

  it('refuses to replace content it could not preserve', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const warningSpy = vi.spyOn(toast, 'warning');
    // Snapshotting is impossible for this note (e.g. it is over the snapshot
    // size limit). Applying disk content anyway would destroy the editor's
    // copy with nothing to recover it from.
    vi.spyOn(
      services.noteSnapshot,
      'preserveExternalOverwrite',
    ).mockResolvedValue('unpreservable');

    await simulateExternalEdit(testEnv, services, 'externally updated');

    await vi.waitFor(
      () => {
        expect(warningSpy).toHaveBeenCalledWith(
          expect.stringContaining('note.md'),
          expect.objectContaining({ id: STALE_TOAST_ID }),
        );
      },
      { timeout: 3_000 },
    );
    expect(editorText(domNode)).toContain('the original note body');
    expect(editorText(domNode)).not.toContain('externally updated');
  });

  it('withdraws a stale-content warning when the file is externally deleted', async () => {
    const { testEnv, services } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    await simulateRefusedExternalEdit(testEnv, services);

    dismissSpy.mockClear();
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-delete',
      wsPath: NOTE_WS_PATH,
      sender: EXTERNAL_SENDER,
    });

    expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);
  });

  it('withdraws a stale-content warning when the file is externally renamed', async () => {
    const { testEnv, services } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    await simulateRefusedExternalEdit(testEnv, services);

    dismissSpy.mockClear();
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-rename',
      oldWsPath: NOTE_WS_PATH,
      wsPath: `${WS_NAME}:renamed.md`,
      sender: EXTERNAL_SENDER,
    });

    expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);
  });

  it('reports when a requested disk version is no longer readable', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');
    const errorSpy = vi.spyOn(toast, 'error');

    await simulateRefusedExternalEdit(testEnv, services);

    vi.spyOn(services.fileSystem, 'readFileAsText').mockResolvedValue(
      undefined,
    );
    dismissSpy.mockClear();
    await asPmEditor(services.editorEngine).loadDiskVersionIntoEditors(
      NOTE_WS_PATH,
    );

    expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not read note.md'),
    );
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('reports when loading a requested disk version throws', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');
    const errorSpy = vi.spyOn(toast, 'error');

    await simulateRefusedExternalEdit(testEnv, services);

    // Read and parse/serialize failures both surface here. A parse failure is
    // deterministic — retrying can never succeed — so the user must be told
    // the action did nothing rather than left guessing.
    vi.spyOn(services.fileSystem, 'readFileAsText').mockRejectedValue(
      new Error('storage read exploded'),
    );
    dismissSpy.mockClear();
    await asPmEditor(services.editorEngine).loadDiskVersionIntoEditors(
      NOTE_WS_PATH,
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('The disk version of note.md was not loaded'),
    );
    // The notice stays: it is still the only way back to the disk copy.
    expect(dismissSpy).not.toHaveBeenCalledWith(STALE_TOAST_ID);
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('withdraws a stale-content warning after a successful local save', async () => {
    const { testEnv, services } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    await simulateRefusedExternalEdit(testEnv, services);

    dismissSpy.mockClear();
    expect(
      services.editorEngine.insertMarkdownAtSelection('LOCAL-VERSION-WINS'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
      expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);
    });
  });

  it('withdraws a stale-content warning when its last editor unmounts', async () => {
    const { testEnv, services, unmountEditor } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    await simulateRefusedExternalEdit(testEnv, services);

    dismissSpy.mockClear();
    unmountEditor();
    expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);
  });

  it('withdraws tracked stale-content warnings during service cleanup', async () => {
    const { controller, testEnv, services } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    await simulateRefusedExternalEdit(testEnv, services);

    dismissSpy.mockClear();
    controller.abort();
    expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);
  });

  it('loading the disk version applies refused content in place without writing back', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    // Fidelity-refused external content: the editor keeps the current note.
    await simulateRefusedExternalEdit(testEnv, services);
    expect(editorText(domNode)).toContain('the original note body');

    // The user consents via the toast action: the disk version replaces
    // only this note's editors — no UI reload, no other editor touched.
    const writeSpy = vi.spyOn(services.fileSystem, 'writeFile');
    await asPmEditor(services.editorEngine).loadDiskVersionIntoEditors(
      NOTE_WS_PATH,
    );

    expect(editorText(domNode)).toContain('the spec');
    expect(editorText(domNode)).not.toContain('the original note body');
    // Consented content equals disk: writing it back would churn mtime.
    expect(writeSpy).not.toHaveBeenCalled();
    expect(dismissSpy).toHaveBeenCalledWith(STALE_TOAST_ID);

    const snapshotsAfterManualLoad =
      await services.noteSnapshot.listSnapshots();
    const originalSnapshot = await services.noteSnapshot.getSnapshot(
      snapshotsAfterManualLoad[0]?.id ?? '',
    );
    expect(originalSnapshot?.content).toBe('the original note body');

    // The accepted disk source becomes the new exact baseline. A later
    // external replacement must preserve the reference-style Markdown, not
    // the editor's normalized inline-link serialization.
    await simulateExternalEdit(
      testEnv,
      services,
      'clean content after manual recovery',
    );
    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain(
          'clean content after manual recovery',
        );
      },
      { timeout: 3_000 },
    );
    const snapshotsAfterExternalReplace =
      await services.noteSnapshot.listSnapshots();
    const snapshotContents = await Promise.all(
      snapshotsAfterExternalReplace.map(
        async ({ id }) =>
          (await services.noteSnapshot.getSnapshot(id))?.content,
      ),
    );
    expect(snapshotContents).toContain(REFUSED_SOURCE);
  });

  it('loading the disk version refuses to clobber edits made since the refusal', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');
    const errorSpy = vi.spyOn(toast, 'error');

    await simulateRefusedExternalEdit(testEnv, services);

    // The user typed after the refusal toast appeared; wedge the save so
    // the edit stays pending (same module-level queue caveat as above).
    let releaseSave = () => {};
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        }),
    );
    expect(
      services.editorEngine.insertMarkdownAtSelection('USER-EDIT-AFTER-TOAST'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(editorText(domNode)).toContain('USER-EDIT-AFTER-TOAST');
    });

    // Their unsaved edit exists nowhere else: the disk version must lose.
    dismissSpy.mockClear();
    await asPmEditor(services.editorEngine).loadDiskVersionIntoEditors(
      NOTE_WS_PATH,
    );

    expect(editorText(domNode)).toContain('USER-EDIT-AFTER-TOAST');
    expect(editorText(domNode)).not.toContain('the spec');
    // Nothing was loaded, so the notice must stay put with an explanation
    // rather than vanish as if the request had succeeded.
    expect(dismissSpy).not.toHaveBeenCalledWith(STALE_TOAST_ID);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('The disk version of note.md was not loaded'),
    );

    releaseSave();
    await vi.waitFor(() => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
    });
  });
});
